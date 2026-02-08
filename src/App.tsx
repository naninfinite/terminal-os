/**
 * `App` controls the top-level flow:
 * - Landing screen (`ENTER.EXE`) with an enter transition.
 * - Desktop shell with scanlines, panels, status bar, and ME.OS provider once entered.
 *
 * Design notes:
 * - `entered` gates which screen is mounted.
 * - `exiting` drives the fade-out state before switching to desktop.
 * - Transition timing matches CSS unless reduced-motion is enabled.
 */
import React, { useEffect, useRef, useState } from 'react';
import landingStyles from './components/Landing/Landing.module.scss';
import crt from './styles/crt.module.scss';
import Desktop from './components/Desktop/Desktop';
import StatusBar from './components/StatusBar/StatusBar';
import shell from './components/AppShell/AppShell.module.scss';
import Scanlines from './components/Scanlines/Scanlines';
import Cursor from './components/Cursor/Cursor';
import { MeOsProvider } from './meos/shell/MeOsProvider';
import { MeOsFullscreenLayer } from './meos/shell/MeOsFullscreenLayer';
import { MeOsVfsProvider } from './meos/vfs/MeOsVfsProvider';

const App: React.FC = () => {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const enterTimeoutRef = useRef<number | null>(null);

  // Shared guard used by click + keyboard triggers to avoid duplicate transitions.
  const triggerEnter = () => {
    if (exiting || entered) return;
    setExiting(true);
  };

  // Listen for Enter key to start exiting from the landing screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') triggerEnter();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [entered, exiting]);

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

  return (
    <>
      <Cursor />
      {!entered ? (
        <div
          className={`${landingStyles.landing} ${crt.crt}`}
          data-state={exiting ? 'exiting' : 'idle'}
        >
          <div className={landingStyles.center}>
            <section className={landingStyles.landingFrame} aria-label="ENTER.EXE">
              <header className={landingStyles.landingHeader}>[ENTER.EXE]</header>
              <div className={landingStyles.landingBody}>
                <div className={landingStyles.videoBox} data-video={videoError ? 'error' : 'ok'}>
                  {!videoError ? (
                    <video
                      className={landingStyles.video}
                      playsInline
                      muted
                      loop
                      poster="/assets/landing-poster.jpg"
                      onError={() => setVideoError(true)}
                    >
                      <source src="/assets/landing-bg.mp4" type="video/mp4" />
                    </video>
                  ) : null}
                  <button
                    type="button"
                    className={landingStyles.enterBtn}
                    onClick={triggerEnter}
                    aria-label="Enter Terminal-OS"
                  >
                    ENTER
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <MeOsProvider>
          <MeOsVfsProvider>
            <div className={shell.shell}>
              <Scanlines />
              <Desktop />
              <StatusBar />
              <MeOsFullscreenLayer />
            </div>
          </MeOsVfsProvider>
        </MeOsProvider>
      )}
    </>
  );
};

export default App;
