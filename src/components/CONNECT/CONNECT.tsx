import React from 'react';
import styles from './CONNECT.module.scss';
import ConnectBoardCanvas from './ConnectBoardCanvas';
import { deriveSeatBindings, resolveConnectTurnIntent, shouldHandleConnectHotkeys } from './connectInput';
import { turnLeft, turnRight } from '../../connect/tronEngine';
import { useConnectRuntime } from '../../connect/ConnectProvider';
import { useMeOs } from '../../meos/shell/MeOsProvider';
import type { TronCpuDifficulty, TronPlayerId, TronQuickMatchSize, TronSeatMode } from '../../connect/types';

type ConnectProps = {
  mode?: 'panel' | 'fullscreen';
};

const STATUS_LABEL: Record<string, string> = {
  idle: 'IDLE',
  queueing: 'QUEUEING',
  hosting: 'HOSTING ROOM',
  joining: 'JOINING ROOM',
  setup: 'SETUP',
  countdown: 'ROUND START',
  playing: 'LIVE',
  round_over: 'ROUND OVER',
  match_over: 'MATCH OVER',
  disconnected: 'DISCONNECTED',
  error: 'ERROR',
};

const CPU_DIFFICULTIES: TronCpuDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
const QUICK_MATCH_SIZES: TronQuickMatchSize[] = [2, 4];
const PLAYER_LABELS: Record<TronPlayerId, string> = {
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
  p4: 'P4',
};
const MODE_LABELS: Record<TronSeatMode, string> = {
  closed: 'CLOSED',
  cpu: 'CPU',
  local: 'LOCAL',
  online: 'ONLINE',
};
const PLAYER_IDS: TronPlayerId[] = ['p1', 'p2', 'p3', 'p4'];

const CONNECT: React.FC<ConnectProps> = ({ mode = 'panel' }) => {
  const {
    closeFullscreen,
    cpuDifficulty,
    displayMode,
    error,
    game,
    isHost,
    joinRoom,
    leaveMatch,
    lobby,
    message,
    mode: matchMode,
    multiplayerAvailable,
    hostRoom,
    openCustomLobby,
    openFullscreen,
    ownedSeatIds,
    quickMatchSize,
    queueWaitMs,
    requestRematch,
    roomCode,
    score,
    sendTurn,
    setCpuDifficulty,
    setQuickMatchSize,
    setSeatMode,
    claimSeat,
    releaseSeat,
    startCpuMatch,
    startLobbyMatch,
    startQuickMatch,
    status,
    canStartLobby,
    canRequestRematch,
  } = useConnectRuntime();
  const { activeScope } = useMeOs();

  const [joinCode, setJoinCode] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const bindings = React.useMemo(() => deriveSeatBindings(ownedSeatIds), [ownedSeatIds]);

  React.useEffect(() => {
    if (mode === 'fullscreen') {
      rootRef.current?.focus();
    }
  }, [mode]);

  const focusRoot = React.useCallback(() => {
    rootRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const matchActive = game != null && (game.phase === 'countdown' || game.phase === 'running');
      if (!shouldHandleConnectHotkeys({
        matchActive,
        isFullscreen: mode === 'fullscreen',
        activeScopeIsConnect: activeScope === 'connect',
        rootContainsFocus: root.contains(document.activeElement),
        target: event.target,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
      })) {
        return;
      }
      const intent = resolveConnectTurnIntent({
        ownedSeatIds,
        key: event.key,
      });
      if (!intent) return;
      event.preventDefault();
      sendTurn(intent.playerId, intent.direction);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeScope, game, mode, ownedSeatIds, sendTurn]);

  const copyRoomCode = async () => {
    if (!roomCode || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      // Clipboard can fail silently in browser sandboxes.
    }
  };

  const rotateLocal = (side: 'left' | 'right') => {
    if (!game || ownedSeatIds.length !== 1) return;
    const playerId = ownedSeatIds[0]!;
    const currentDirection = game.players[playerId].direction;
    sendTurn(playerId, side === 'left' ? turnLeft(currentDirection) : turnRight(currentDirection));
    focusRoot();
  };

  const localControlHint = React.useMemo(() => {
    if (bindings.length === 0) {
      return 'CLAIM OR CONFIGURE A LOCAL SEAT TO PLAY.';
    }
    if (bindings.length === 1) {
      return `${PLAYER_LABELS[bindings[0]!.playerId]}: WASD + ARROWS`;
    }
    return `${PLAYER_LABELS[bindings[0]!.playerId]}: WASD  |  ${PLAYER_LABELS[bindings[1]!.playerId]}: ARROWS`;
  }, [bindings]);

  const statusLabel = STATUS_LABEL[status] ?? status.toUpperCase();
  const activeSession = matchMode !== 'idle' || status === 'queueing';
  const canEditLobby = lobby?.phase === 'setup'
    && lobby.source !== 'quick_match'
    && (matchMode === 'local' || (matchMode === 'online' && isHost));
  const showTouchControls = ownedSeatIds.length === 1 && game != null && (game.phase === 'countdown' || game.phase === 'running');

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${mode === 'fullscreen' ? styles.rootFullscreen : ''}`.trim()}
      tabIndex={0}
      onMouseDown={focusRoot}
      data-panel-zoom-block="true"
    >
      <div className={styles.surface}>
        <header className={styles.headerRow}>
          <div className={styles.titleBlock}>
            <p className={styles.modeLabel}>CONNECT.EXE</p>
            <p className={styles.statusLine}>{statusLabel}</p>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.metaToken}>{roomCode ? `ROOM ${roomCode}` : `TRON ${quickMatchSize}P`}</span>
            {mode === 'panel' ? (
              <button type="button" className={styles.modeBtn} onClick={openFullscreen}>
                OPEN
              </button>
            ) : displayMode === 'fullscreen' ? (
              <button type="button" className={styles.modeBtn} onClick={closeFullscreen}>
                CLOSE
              </button>
            ) : null}
          </div>
        </header>

        <div className={styles.hudRow}>
          {PLAYER_IDS.map((playerId) => {
            const seat = lobby?.seats[playerId] ?? null;
            const player = game?.players[playerId];
            const isOwned = ownedSeatIds.includes(playerId);
            return (
              <div key={playerId} className={`${styles.hudChip} ${isOwned ? styles.hudChipOwned : ''}`.trim()}>
                <span>{PLAYER_LABELS[playerId]}</span>
                <span>{seat ? MODE_LABELS[seat.mode] : '--'}</span>
                <span>{String(score[playerId] ?? 0).padStart(2, '0')}</span>
                <span>{player ? (player.alive ? 'LIVE' : 'CRASH') : '--'}</span>
              </div>
            );
          })}
        </div>

        <p className={styles.hint}>{localControlHint}</p>

        {game ? (
          <div className={styles.boardShell}>
            <ConnectBoardCanvas game={game} mode={mode} />
            <div className={styles.boardMeta}>
              <div className={styles.metaRow}>
                <span>TICK {game.tick}</span>
                <span>ROUND {game.round}</span>
                <span>{game.phase === 'countdown' ? `${Math.ceil(game.countdownTicksRemaining / 20)}S` : game.roundResult?.reason?.toUpperCase() ?? 'ACTIVE'}</span>
              </div>
              {(message || error) ? (
                <p className={error ? styles.errorText : styles.noteText}>{error ?? message}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.statusPanel}>
            <p className={styles.noteText}>
              {error ?? message ?? 'Choose Quick Match or build a 4-seat custom Tron lobby.'}
            </p>
            {status === 'queueing' ? (
              <p className={styles.noteText}>WAITING {Math.ceil(queueWaitMs / 1000)}S</p>
            ) : null}
            {roomCode ? (
              <div className={styles.roomRow}>
                <span className={styles.roomCode}>{roomCode}</span>
                <button type="button" className={styles.actionBtn} onClick={copyRoomCode}>
                  COPY ROOM CODE
                </button>
              </div>
            ) : null}
          </div>
        )}

        {lobby ? (
          <div className={styles.seatList}>
            {PLAYER_IDS.map((playerId) => {
              const seat = lobby.seats[playerId];
              const player = game?.players[playerId];
              const canClaim = lobby.phase === 'setup' && matchMode === 'online' && seat.mode === 'online' && seat.ownerClientId == null && ownedSeatIds.length < 2;
              const canRelease = lobby.phase === 'setup' && matchMode === 'online' && seat.mode === 'online' && seat.ownerClientId != null && ownedSeatIds.includes(playerId);
              const seatOptions: TronSeatMode[] = lobby.source === 'local_custom'
                ? ['closed', 'cpu', 'local']
                : lobby.source === 'online_custom'
                  ? ['closed', 'cpu', 'local', 'online']
                  : ['closed', 'cpu', 'local', 'online'];
              return (
                <div key={playerId} className={styles.seatRow}>
                  <div className={styles.seatMain}>
                    <span className={styles.seatLabel}>{PLAYER_LABELS[playerId]}</span>
                    <span className={styles.seatMode}>{MODE_LABELS[seat.mode]}</span>
                    <span className={styles.seatMeta}>{seat.ownerClientId ? seat.ownerClientId.slice(0, 8) : '--'}</span>
                    <span className={styles.seatMeta}>{String(score[playerId] ?? 0).padStart(2, '0')}</span>
                    <span className={styles.seatMeta}>{player ? (player.alive ? 'LIVE' : 'CRASH') : '--'}</span>
                  </div>
                  <div className={styles.seatActions}>
                    {canEditLobby ? (
                      <select
                        className={styles.select}
                        value={seat.mode}
                        onChange={(event) => {
                          setSeatMode(playerId, event.target.value as TronSeatMode);
                          focusRoot();
                        }}
                      >
                        {seatOptions.map((option) => (
                          <option key={option} value={option}>{MODE_LABELS[option]}</option>
                        ))}
                      </select>
                    ) : null}
                    {canClaim ? (
                      <button type="button" className={styles.actionBtn} onClick={() => { claimSeat(playerId); focusRoot(); }}>
                        CLAIM
                      </button>
                    ) : null}
                    {canRelease ? (
                      <button type="button" className={styles.actionBtn} onClick={() => { releaseSeat(playerId); focusRoot(); }}>
                        RELEASE
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {!activeSession ? (
          <div className={styles.actionGrid}>
            <div className={styles.quickMatchRow}>
              {QUICK_MATCH_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`${styles.actionBtn} ${quickMatchSize === size ? styles.actionBtnActive : ''}`.trim()}
                  onClick={() => {
                    setQuickMatchSize(size);
                    focusRoot();
                  }}
                >
                  QUICK {size}P
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={startQuickMatch}
              disabled={!multiplayerAvailable}
            >
              START QUICK MATCH
            </button>
            <button type="button" className={styles.actionBtn} onClick={() => { openCustomLobby('custom'); focusRoot(); }}>
              CUSTOM MATCH
            </button>
            <button type="button" className={styles.actionBtn} onClick={() => { startCpuMatch(); focusRoot(); }}>
              PLAY CPU
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={hostRoom}
              disabled={!multiplayerAvailable}
            >
              HOST ROOM
            </button>
            <label className={styles.selectWrap}>
              <span className={styles.selectLabel}>CPU</span>
              <select
                className={styles.select}
                value={cpuDifficulty}
                onChange={(event) => setCpuDifficulty(event.target.value as TronCpuDifficulty)}
              >
                {CPU_DIFFICULTIES.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>{difficulty.toUpperCase()}</option>
                ))}
              </select>
            </label>
            <div className={styles.joinRow}>
              <input
                className={styles.joinInput}
                type="text"
                inputMode="text"
                maxLength={6}
                value={joinCode}
                placeholder="ROOM CODE"
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                aria-label="Join room code"
              />
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => joinRoom(joinCode)}
                disabled={!multiplayerAvailable}
              >
                JOIN ROOM
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.actionGrid}>
            {roomCode ? (
              <button type="button" className={styles.actionBtn} onClick={copyRoomCode}>
                COPY ROOM CODE
              </button>
            ) : null}
            {lobby?.phase === 'setup' && canStartLobby ? (
              <button type="button" className={styles.actionBtn} onClick={() => { startLobbyMatch(); focusRoot(); }}>
                START MATCH
              </button>
            ) : null}
            {canRequestRematch ? (
              <button type="button" className={styles.actionBtn} onClick={() => { requestRematch(); focusRoot(); }}>
                REMATCH
              </button>
            ) : null}
            <button type="button" className={styles.actionBtn} onClick={leaveMatch}>
              LEAVE MATCH
            </button>
          </div>
        )}

        {showTouchControls ? (
          <div className={styles.touchControls} data-panel-zoom-block="true">
            <button type="button" className={styles.touchBtn} onClick={() => rotateLocal('left')}>
              TURN LEFT
            </button>
            <button type="button" className={styles.touchBtn} onClick={() => rotateLocal('right')}>
              TURN RIGHT
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CONNECT;
