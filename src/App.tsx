import React, { useEffect, useRef, useState } from 'react';
import landingStyles from './components/Landing/Landing.module.scss';
import crt from './styles/crt.module.scss';
import Desktop from './components/Desktop/Desktop';
import StatusBar from './components/StatusBar/StatusBar';
import shell from './components/AppShell/AppShell.module.scss';
import Scanlines from './components/Scanlines/Scanlines';
import Panel from './components/Panel/Panel';
import Cursor from './components/Cursor/Cursor';
import WindowOverlay, { type AppKey } from './components/WindowOverlay/WindowOverlay';
import ME from './components/ME/ME';
import YOU from './components/YOU/YOU';
import THIRD from './components/THIRD/THIRD';
import CONNECT from './components/CONNECT/CONNECT';

const App: React.FC = () => {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [activeApp, setActiveApp] = useState<AppKey | null>(null);
  const enterTimeoutRef = useRef<number | null>(null);

  // Listen for Enter key to start exiting
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (!exiting && !entered) {
          setExiting(true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [entered, exiting]);

  // When exiting starts, schedule transition to entered after delay
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
            <Panel title="ENTER.EXE">
              <div className={landingStyles.panelContent}>
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
                    onClick={() => {
                      if (exiting || entered) return;
                      setExiting(true);
                    }}
                    aria-label="Enter Terminal-OS"
                  >
                    ENTER
                  </button>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      ) : (
        <div className={shell.shell}>
          <Cursor />
          <Scanlines />
          <Desktop
            onOpenApp={(key) => {
              setActiveApp(key);
            }}
          />
          <StatusBar />
          {activeApp ? (
            <WindowOverlay
              activeApp={activeApp}
              onClose={() => setActiveApp(null)}
              onSelectApp={(key) => setActiveApp(key)}
            >
              {activeApp === 'ME' ? <ME /> : null}
              {activeApp === 'YOU' ? <YOU /> : null}
              {activeApp === 'THIRD' ? <THIRD /> : null}
              {activeApp === 'CONNECT' ? <CONNECT /> : null}
            </WindowOverlay>
          ) : null}
        </div>
      )}
    </>
  );
};

export default App;


