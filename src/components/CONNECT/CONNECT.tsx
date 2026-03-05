import React from 'react';
import styles from './CONNECT.module.scss';
import ConnectBoardCanvas from './ConnectBoardCanvas';
import { turnLeft, turnRight } from '../../connect/tronEngine';
import { useConnectRuntime } from '../../connect/ConnectProvider';
import type { TronCpuDifficulty, TronDirection } from '../../connect/types';

type ConnectProps = {
  mode?: 'panel' | 'fullscreen';
};

const KEY_TO_DIRECTION: Record<string, TronDirection> = {
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  w: 'up',
  W: 'up',
  d: 'right',
  D: 'right',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
};

const STATUS_LABEL: Record<string, string> = {
  idle: 'IDLE',
  queueing: 'QUEUEING',
  hosting: 'HOSTING',
  joining: 'JOINING',
  countdown: 'ROUND START',
  playing: 'LIVE',
  round_over: 'ROUND OVER',
  match_over: 'MATCH OVER',
  disconnected: 'DISCONNECTED',
  error: 'ERROR',
};

const CPU_DIFFICULTIES: TronCpuDifficulty[] = ['easy', 'medium', 'hard', 'expert'];

const formatOpponentLabel = (mode: string): string => (
  mode === 'cpu' ? 'CPU' : 'OPPONENT'
);

const CONNECT: React.FC<ConnectProps> = ({ mode = 'panel' }) => {
  const {
    closeFullscreen,
    cpuDifficulty,
    displayMode,
    error,
    game,
    joinRoom,
    leaveMatch,
    localPlayerId,
    message,
    mode: matchMode,
    multiplayerAvailable,
    hostRoom,
    openFullscreen,
    queueWaitMs,
    requestRematch,
    roomCode,
    score,
    sendTurn,
    setCpuDifficulty,
    startCpuMatch,
    startQuickMatch,
    status,
    canRequestRematch,
    canSuggestCpuFallback,
  } = useConnectRuntime();

  const [joinCode, setJoinCode] = React.useState('');
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const localScore = score[localPlayerId];
  const opponentId = localPlayerId === 'p1' ? 'p2' : 'p1';
  const opponentScore = score[opponentId];

  React.useEffect(() => {
    if (mode === 'fullscreen') {
      rootRef.current?.focus();
    }
  }, [mode]);

  const focusRoot = () => {
    rootRef.current?.focus();
  };

  const copyRoomCode = async () => {
    if (!roomCode || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      // Clipboard can fail silently in browser sandboxes.
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const direction = KEY_TO_DIRECTION[event.key];
    if (!direction) return;
    event.preventDefault();
    sendTurn(direction);
  };

  const rotateLocal = (side: 'left' | 'right') => {
    if (!game) return;
    const currentDirection = game.players[localPlayerId].direction;
    sendTurn(side === 'left' ? turnLeft(currentDirection) : turnRight(currentDirection));
  };

  const statusLabel = STATUS_LABEL[status] ?? status.toUpperCase();
  const hintText = 'WASD / ARROW KEYS TO STEER. NO REVERSE TURNS.';
  const hasActiveMatch = (
    matchMode !== 'idle'
    || status === 'queueing'
    || status === 'hosting'
    || status === 'joining'
  );

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${mode === 'fullscreen' ? styles.rootFullscreen : ''}`.trim()}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseDown={focusRoot}
      data-panel-zoom-block="true"
    >
      <div className={styles.surface}>
        <div className={styles.topRow}>
          <div className={styles.identity}>
            <span className={styles.stateToken}>{statusLabel}</span>
            <span className={styles.connectionToken}>{matchMode === 'cpu' ? 'CPU' : (roomCode ? `ROOM ${roomCode}` : 'TRON V1')}</span>
          </div>
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

        <div className={styles.scoreboard}>
          <div className={styles.scoreCard}>
            <span className={styles.scoreLabel}>YOU</span>
            <span className={styles.scoreValue}>{localScore}</span>
          </div>
          <div className={styles.scoreCard}>
            <span className={styles.scoreLabel}>{formatOpponentLabel(matchMode)}</span>
            <span className={styles.scoreValue}>{opponentScore}</span>
          </div>
          <div className={styles.scoreCard}>
            <span className={styles.scoreLabel}>TARGET</span>
            <span className={styles.scoreValue}>{game?.firstToScore ?? 5}</span>
          </div>
        </div>

        <p className={styles.hint}>{hintText}</p>

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
              {error ?? message ?? 'Quick Match uses Supabase Realtime. CPU mode is always available.'}
            </p>
            {roomCode ? (
              <div className={styles.roomRow}>
                <span className={styles.roomCode}>{roomCode}</span>
                <button type="button" className={styles.actionBtn} onClick={copyRoomCode}>
                  COPY ROOM CODE
                </button>
              </div>
            ) : null}
            {status === 'queueing' ? (
              <p className={styles.noteText}>WAITING {Math.ceil(queueWaitMs / 1000)}S</p>
            ) : null}
          </div>
        )}

        <div className={styles.actionGrid}>
          {!hasActiveMatch ? (
            <>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={startQuickMatch}
                disabled={!multiplayerAvailable}
              >
                QUICK MATCH
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={hostRoom}
                disabled={!multiplayerAvailable}
              >
                HOST ROOM
              </button>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => startCpuMatch(cpuDifficulty)}
              >
                PLAY CPU
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
            </>
          ) : (
            <>
              {roomCode ? (
                <button type="button" className={styles.actionBtn} onClick={copyRoomCode}>
                  COPY ROOM CODE
                </button>
              ) : null}
              {canSuggestCpuFallback ? (
                <button type="button" className={styles.actionBtn} onClick={() => startCpuMatch(cpuDifficulty)}>
                  PLAY CPU INSTEAD
                </button>
              ) : null}
              {canRequestRematch ? (
                <button type="button" className={styles.actionBtn} onClick={requestRematch}>
                  REMATCH
                </button>
              ) : null}
              {status === 'disconnected' ? (
                <button type="button" className={styles.actionBtn} onClick={() => startCpuMatch(cpuDifficulty)}>
                  PLAY CPU
                </button>
              ) : null}
              <button type="button" className={styles.actionBtn} onClick={leaveMatch}>
                LEAVE MATCH
              </button>
            </>
          )}
        </div>

        <div className={styles.touchControls} data-panel-zoom-block="true">
          <button type="button" className={styles.touchBtn} onClick={() => rotateLocal('left')}>
            TURN LEFT
          </button>
          <button type="button" className={styles.touchBtn} onClick={() => rotateLocal('right')}>
            TURN RIGHT
          </button>
        </div>
      </div>
    </div>
  );
};

export default CONNECT;
