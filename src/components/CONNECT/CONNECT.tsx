import React from 'react';
import styles from './CONNECT.module.scss';
import ConnectBoardCanvas from './ConnectBoardCanvas';
import { deriveSeatBindings, resolveConnectTurnIntent, shouldHandleConnectHotkeys } from './connectInput';
import { turnLeft, turnRight } from '../../connect/tronEngine';
import { useConnectRuntime } from '../../connect/ConnectProvider';
import { useMeOs } from '../../meos/shell/MeOsProvider';
import type { TronCpuDifficulty, TronPlayerId, TronSeatMode } from '../../connect/types';

type ConnectProps = {
  mode?: 'panel' | 'fullscreen';
};

const STATUS_LABEL: Record<string, string> = {
  idle: 'IDLE',
  queueing: 'QUEUEING',
  hosting: 'HOSTING',
  joining: 'JOINING',
  setup: 'SETUP',
  countdown: 'ROUND START',
  playing: 'LIVE',
  round_over: 'ROUND OVER',
  match_over: 'MATCH OVER',
  disconnected: 'DISCONNECTED',
  error: 'ERROR',
};

const CPU_DIFFICULTIES: TronCpuDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
const PLAYER_LABELS: Record<TronPlayerId, string> = {
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
  p4: 'P4',
};
const PLAYER_IDS: TronPlayerId[] = ['p1', 'p2', 'p3', 'p4'];

const CONNECT: React.FC<ConnectProps> = ({ mode = 'panel' }) => {
  const {
    closeFullscreen,
    connectionState,
    cpuDifficulty,
    displayMode,
    error,
    game,
    hostRoom,
    joinRoom,
    leaveMatch,
    localHumanCount,
    lobby,
    message,
    mode: matchMode,
    multiplayerAvailable,
    notificationCount,
    openFullscreen,
    ownedPlayerIds,
    participantCount,
    quickMatchSize,
    recentCrashEvents,
    requestRematch,
    roomCode,
    score,
    sendTurn,
    setCpuDifficulty,
    setLocalHumanCount,
    setParticipantCount,
    setQuickMatchSize,
    startCpuMatch,
    startLocalMatch,
    startQuickMatch,
    status,
    canRequestRematch,
  } = useConnectRuntime();
  const { activeScope } = useMeOs();

  const [joinCode, setJoinCode] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const bindings = React.useMemo(() => deriveSeatBindings(ownedPlayerIds), [ownedPlayerIds]);

  React.useEffect(() => {
    if (mode === 'fullscreen') {
      rootRef.current?.focus();
    }
  }, [mode]);

  const focusRoot = React.useCallback(() => {
    rootRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const copyPayload = async () => {
      try {
        if (!navigator.clipboard) return;
        const lines = ['CONNECT.EXE'];
        if (game) {
          lines.push(`ROUND ${game.round}`);
          lines.push(`STATUS ${STATUS_LABEL[status] ?? status.toUpperCase()}`);
          lines.push(`PLAYERS ${game.activePlayerIds.join(', ').toUpperCase()}`);
          if (game.roundResult?.winner) {
            lines.push(`WINNER ${game.roundResult.winner.toUpperCase()}`);
          }
        } else {
          lines.push('TRON READY');
        }
        await navigator.clipboard.writeText(lines.join('\n'));
      } catch {
        // Clipboard access can fail silently in browser sandboxes.
      }
    };

    const onCopyBanner = () => {
      void copyPayload();
    };

    window.addEventListener('terminalos:connect:copy-banner', onCopyBanner as EventListener);
    return () => window.removeEventListener('terminalos:connect:copy-banner', onCopyBanner as EventListener);
  }, [game, status]);

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
        ownedSeatIds: ownedPlayerIds,
        key: event.key,
      });
      if (!intent) return;

      event.preventDefault();
      sendTurn(intent.playerId, intent.direction);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeScope, game, mode, ownedPlayerIds, sendTurn]);

  const rotateLocal = React.useCallback((side: 'left' | 'right') => {
    if (!game || ownedPlayerIds.length !== 1) return;
    const playerId = ownedPlayerIds[0]!;
    const currentDirection = game.players[playerId].direction;
    sendTurn(playerId, side === 'left' ? turnLeft(currentDirection) : turnRight(currentDirection));
    focusRoot();
  }, [focusRoot, game, ownedPlayerIds, sendTurn]);

  const localControlHint = React.useMemo(() => {
    if (bindings.length === 0) {
      return 'CONFIGURE A LOCAL MATCH TO ENABLE KEYBOARD CONTROL.';
    }
    if (bindings.length === 1) {
      return `${PLAYER_LABELS[bindings[0]!.playerId]}: WASD + ARROWS`;
    }
    return `${PLAYER_LABELS[bindings[0]!.playerId]}: WASD  |  ${PLAYER_LABELS[bindings[1]!.playerId]}: ARROWS`;
  }, [bindings]);

  const statusLabel = STATUS_LABEL[status] ?? status.toUpperCase();
  const previewActivePlayerIds = PLAYER_IDS.slice(0, participantCount);
  const activePlayerIds = game?.activePlayerIds ?? previewActivePlayerIds;
  const showTouchControls = ownedPlayerIds.length === 1 && game != null && (game.phase === 'countdown' || game.phase === 'running');
  const winnerLabel = game?.roundResult?.winner ? PLAYER_LABELS[game.roundResult.winner] : 'DRAW';

  const getSeatMode = React.useCallback((playerId: TronPlayerId): TronSeatMode => {
    const seat = lobby?.seats[playerId];
    if (seat) return seat.mode;
    const previewIndex = previewActivePlayerIds.indexOf(playerId);
    if (previewIndex === -1) return 'closed';
    return previewIndex < localHumanCount ? 'local' : 'cpu';
  }, [lobby, localHumanCount, previewActivePlayerIds]);

  const getSeatRoleLabel = React.useCallback((playerId: TronPlayerId): string => {
    const seatMode = getSeatMode(playerId);
    if (seatMode === 'local') return 'LOCAL';
    if (seatMode === 'online') return ownedPlayerIds.includes(playerId) ? 'YOU' : 'ONLINE';
    if (seatMode === 'cpu') return 'CPU';
    return 'CLOSED';
  }, [getSeatMode, ownedPlayerIds]);

  const handleJoinRoom = React.useCallback(() => {
    joinRoom(joinCode);
    focusRoot();
  }, [focusRoot, joinCode, joinRoom]);

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
            <span className={styles.metaToken}>{game ? `ROUND ${game.round}` : `LOCAL ${participantCount}P`}</span>
            <span className={styles.metaToken}>{matchMode === 'idle' ? 'READY' : matchMode.toUpperCase()}</span>
            {roomCode ? <span className={styles.metaToken}>ROOM {roomCode}</span> : null}
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
          {activePlayerIds.map((playerId) => {
            const player = game?.players[playerId];
            const owned = ownedPlayerIds.includes(playerId);
            return (
              <div key={playerId} className={`${styles.hudChip} ${owned ? styles.hudChipOwned : ''}`.trim()}>
                <span>{PLAYER_LABELS[playerId]}</span>
                <span>{getSeatRoleLabel(playerId)}</span>
                <span>{String(score[playerId] ?? 0).padStart(2, '0')}</span>
                <span>{player ? (player.alive ? 'LIVE' : 'OUT') : '--'}</span>
              </div>
            );
          })}
        </div>

        <p className={styles.hint}>{localControlHint}</p>

        {game ? (
          <div className={styles.boardShell}>
            <ConnectBoardCanvas game={game} crashEvents={recentCrashEvents} mode={mode} />
            <div className={styles.boardMeta}>
              <div className={styles.metaRow}>
                <span>TICK {game.tick}</span>
                <span>{roomCode ? `ROOM ${roomCode}` : connectionState.toUpperCase()}</span>
                <span>
                  {game.phase === 'countdown'
                    ? `${Math.ceil(game.countdownTicksRemaining / 20)}S`
                    : game.phase === 'round_over' || game.phase === 'match_over'
                      ? `${winnerLabel} ${game.phase === 'match_over' ? 'WINS MATCH' : 'TAKES ROUND'}`
                      : 'ACTIVE'}
                </span>
              </div>
              {(message || error || notificationCount > 0) ? (
                <p className={error ? styles.errorText : styles.noteText}>
                  {error ?? message ?? `${winnerLabel} READY.`}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.statusPanel}>
            <p className={styles.noteText}>
              {error ?? message ?? 'GRIDLESS LIGHT-CYCLE ARENA READY. LOCAL MATCHES SUPPORT UP TO 4 RIDERS WITH UP TO 2 HUMANS ON ONE KEYBOARD.'}
            </p>
            <div className={styles.metaRow}>
              <span>ONLINE {multiplayerAvailable ? 'READY' : 'DISABLED'}</span>
              <span>{connectionState.toUpperCase()}</span>
              <span>{quickMatchSize}P QUEUE</span>
            </div>
          </div>
        )}

        {!game ? (
          <div className={styles.actionGrid}>
            <div className={styles.controlGroup}>
              <span className={styles.selectLabel}>LOCAL MATCH</span>
              <div className={styles.optionRow}>
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`${styles.actionBtn} ${participantCount === count ? styles.actionBtnActive : ''}`.trim()}
                    onClick={() => {
                      setParticipantCount(count as 2 | 3 | 4);
                      focusRoot();
                    }}
                  >
                    {count} PLAYERS
                  </button>
                ))}
              </div>

              <div className={styles.optionRow}>
                {[1, 2].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`${styles.actionBtn} ${localHumanCount === count ? styles.actionBtnActive : ''}`.trim()}
                    onClick={() => {
                      setLocalHumanCount(count as 1 | 2);
                      focusRoot();
                    }}
                    disabled={count > participantCount}
                  >
                    {count} LOCAL
                  </button>
                ))}
              </div>

              <label className={styles.selectWrap}>
                <span className={styles.selectLabel}>CPU DIFFICULTY</span>
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

              <div className={styles.optionRow}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => {
                    startLocalMatch();
                    focusRoot();
                  }}
                >
                  START LOCAL
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => {
                    startCpuMatch(cpuDifficulty);
                    focusRoot();
                  }}
                >
                  PLAY CPU
                </button>
              </div>
            </div>

            <div className={styles.controlGroup}>
              <span className={styles.selectLabel}>ONLINE</span>
              <div className={styles.quickMatchRow}>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${quickMatchSize === 2 ? styles.actionBtnActive : ''}`.trim()}
                  onClick={() => {
                    setQuickMatchSize(2);
                    startQuickMatch();
                    focusRoot();
                  }}
                  disabled={!multiplayerAvailable}
                >
                  QUICK MATCH
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => {
                    hostRoom();
                    focusRoot();
                  }}
                  disabled={!multiplayerAvailable}
                >
                  HOST ROOM
                </button>
              </div>

              <label className={styles.selectWrap}>
                <span className={styles.selectLabel}>JOIN ROOM</span>
                <div className={styles.joinRow}>
                  <input
                    className={styles.joinInput}
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                    placeholder="ROOM CODE"
                    maxLength={6}
                    inputMode="text"
                    autoCapitalize="characters"
                  />
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={handleJoinRoom}
                    disabled={!multiplayerAvailable}
                  >
                    JOIN
                  </button>
                </div>
              </label>

              <p className={styles.noteText}>
                {multiplayerAvailable
                  ? 'ONLINE MATCHES STAY 2P IN THIS PASS. LOCAL MODES EXPAND TO 2-4 RIDERS.'
                  : 'SUPABASE ENV VARS ARE MISSING, SO CONNECT IS RUNNING IN LOCAL/CPU MODE ONLY.'}
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.actionGrid}>
            {canRequestRematch ? (
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => {
                  requestRematch();
                  focusRoot();
                }}
              >
                REMATCH
              </button>
            ) : null}
            <button type="button" className={styles.actionBtn} onClick={leaveMatch}>
              EXIT
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
