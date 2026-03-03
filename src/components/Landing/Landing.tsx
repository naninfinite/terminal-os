import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import styles from './Landing.module.scss';
import crt from '../../styles/crt.module.scss';
import DigitalRain from '../Effects/DigitalRain/DigitalRain';

export type LandingPhase = 'idle' | 'loading' | 'transitioning' | 'entered' | 'error';

export type LandingSurfaceHandle = {
  root: HTMLDivElement | null;
  frame: HTMLElement | null;
  scene: HTMLDivElement | null;
  field: HTMLDivElement | null;
  rainCanvas: HTMLCanvasElement | null;
  glow: HTMLDivElement | null;
  grid: HTMLDivElement | null;
  sweep: HTMLDivElement | null;
  telemetry: HTMLDivElement | null;
  status: HTMLParagraphElement | null;
  button: HTMLButtonElement | null;
  flash: HTMLDivElement | null;
};

export type LandingProps = {
  phase: LandingPhase;
  busy: boolean;
  sceneLoading: boolean;
  buttonLabel: string;
  status: string;
  runtimeStatus: string;
  onEnter: () => void;
  disabled: boolean;
  onReady?: () => void;
};

const Landing = forwardRef<LandingSurfaceHandle, LandingProps>(({
  phase,
  busy,
  sceneLoading,
  buttonLabel,
  status,
  runtimeStatus,
  onEnter,
  disabled,
  onReady,
}, ref) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const rainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const sweepRef = useRef<HTMLDivElement | null>(null);
  const telemetryRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => ({
    root: rootRef.current,
    frame: frameRef.current,
    scene: sceneRef.current,
    field: fieldRef.current,
    rainCanvas: rainCanvasRef.current,
    glow: glowRef.current,
    grid: gridRef.current,
    sweep: sweepRef.current,
    telemetry: telemetryRef.current,
    status: statusRef.current,
    button: buttonRef.current,
    flash: flashRef.current,
  }), []);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <div
      ref={rootRef}
      className={`${styles.landing} ${crt.crt}`}
      data-state={phase}
      data-landing-root="true"
    >
      <div ref={flashRef} className={styles.transitionFlash} aria-hidden="true" />
      <div className={styles.center}>
        <section
          ref={frameRef}
          className={styles.landingFrame}
          aria-label="ENTER.EXE"
          aria-busy={busy}
        >
          <header className={styles.landingHeader}>[ENTER.EXE]</header>
          <div className={styles.landingBody}>
            <div
              ref={sceneRef}
              className={styles.videoBox}
              data-loading={sceneLoading ? 'true' : 'false'}
              data-landing-scene="true"
            >
              <div ref={fieldRef} className={styles.sceneField} aria-hidden="true">
                <DigitalRain
                  ref={rainCanvasRef}
                  className={styles.sceneRain}
                  enabled={sceneLoading || phase === 'transitioning'}
                  direction="rtl"
                  fontSize={13}
                  speed={1.05}
                  fadeAlpha={0.05}
                  fps={30}
                />
                <div ref={glowRef} className={styles.sceneGlow} />
                <div ref={gridRef} className={styles.sceneGrid} />
                <div ref={sweepRef} className={styles.sceneSweep} />
                <div
                  ref={telemetryRef}
                  className={styles.sceneTelemetry}
                  data-landing-telemetry="true"
                >
                  <span>BOOT SECTOR 01</span>
                  <span>DISPLAY BUS ONLINE</span>
                  <span>{runtimeStatus}</span>
                </div>
              </div>
              <p
                ref={statusRef}
                className={styles.enterStatus}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-landing-status="true"
              >
                {status}
              </p>
              <button
                ref={buttonRef}
                type="button"
                className={styles.enterBtn}
                onClick={onEnter}
                aria-label="Enter Terminal-OS"
                aria-busy={busy}
                data-landing-enter="true"
                disabled={disabled}
              >
                {buttonLabel}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
});

Landing.displayName = 'Landing';

export default Landing;
