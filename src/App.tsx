/**
 * `App` controls the top-level flow:
 * - Landing screen (`ENTER.EXE`) with an enter transition.
 * - Desktop shell mounts after the landing screen exit transition completes.
 *
 * Design notes:
 * - `entered` gates which screen is mounted.
 * - `exiting` drives the fade-out state before switching to desktop.
 * - Transition timing matches CSS unless reduced-motion is enabled.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import DesktopRuntime from './components/AppShell/DesktopRuntime';
import landingStyles from './components/Landing/Landing.module.scss';
import crt from './styles/crt.module.scss';
import Cursor from './components/Cursor/Cursor';

const App: React.FC = () => {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const enterTimeoutRef = useRef<number | null>(null);

  // Shared guard used by click + keyboard triggers to avoid duplicate transitions.
  const triggerEnter = useCallback(() => {
    if (exiting || entered) return;
    setExiting(true);
  }, [entered, exiting]);

  // Listen for Enter key to start exiting from the landing screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') triggerEnter();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [triggerEnter]);

  // When exiting starts, schedule transition to the desktop after a short delay.
  useEffect(() => {
    if (exiting && !entered) {
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const delayMs = reduce ? 0 : 600; // match CSS transition duration
      if (enterTimeoutRef.current != null) {
        window.clearTimeout(enterTimeoutRef.current);
      }
      enterTimeoutRef.current = window.setTimeout(() => setEntered(true), delayMs);
      return () => {
        if (enterTimeoutRef.current != null) {
          window.clearTimeout(enterTimeoutRef.current);
          enterTimeoutRef.current = null;
        }
      };
    }
  }, [exiting, entered]);

  const enterButtonLabel = exiting ? 'ENTERING...' : 'ENTER';
  const enterStatus = exiting ? 'ENTERING SHELL...' : 'PRESS ENTER TO LOAD DESKTOP.';
  const runtimeStatus = exiting ? 'LINKING SHELL...' : 'STANDBY';

  return (
    <>
      <Cursor />
      {!entered ? (
        <div
          className={`${landingStyles.landing} ${crt.crt}`}
          data-state={exiting ? 'exiting' : 'idle'}
        >
          <div className={landingStyles.center}>
            <section
              className={landingStyles.landingFrame}
              aria-label="ENTER.EXE"
              aria-busy={exiting}
            >
              <header className={landingStyles.landingHeader}>[ENTER.EXE]</header>
              <div className={landingStyles.landingBody}>
                <div className={landingStyles.videoBox} data-loading={exiting ? 'true' : 'false'}>
                  <div className={landingStyles.sceneField} aria-hidden="true">
                    <div className={landingStyles.sceneGlow} />
                    <div className={landingStyles.sceneGrid} />
                    <div className={landingStyles.sceneSweep} />
                    <div className={landingStyles.sceneTelemetry}>
                      <span>BOOT SECTOR 01</span>
                      <span>DISPLAY BUS ONLINE</span>
                      <span>{runtimeStatus}</span>
                    </div>
                  </div>
                  <p className={landingStyles.enterStatus} role="status" aria-live="polite" aria-atomic="true">
                    {enterStatus}
                  </p>
                  <button
                    type="button"
                    className={landingStyles.enterBtn}
                    onClick={triggerEnter}
                    aria-label="Enter Terminal-OS"
                    aria-busy={exiting}
                    disabled={exiting}
                  >
                    {enterButtonLabel}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <DesktopRuntime />
      )}
    </>
  );
};

export default App;
