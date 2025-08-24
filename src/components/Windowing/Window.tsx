import React, { useContext, useMemo, useRef, useState } from 'react';
import { WindowManagerContext } from './WindowManager';
import type { WindowState } from './WindowTypes';
import { saveWindowRect } from '../../utils/windowRectStorage';

type Props = { win: WindowState };

export const Window: React.FC<Props> = ({ win }) => {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) return null;
  const { moveWindow, resizeWindow, focusWindow, toggleMaximize, minimizeWindow, boundsRef } = ctx;

  const draggingRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onMouseDownHeader = (e: React.MouseEvent) => {
    e.preventDefault();
    focusWindow(win.id);
    if (!win.maximized) {
      draggingRef.current = { startX: e.clientX, startY: e.clientY, origX: win.rect.x, origY: win.rect.y };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp, { once: true });
    }
  };
  const onMouseMove = (e: MouseEvent) => {
    const d = draggingRef.current; if (!d) return;
    const dx = e.clientX - d.startX; const dy = e.clientY - d.startY;
    // clamp within bounds
    const bounds = boundsRef.current?.getBoundingClientRect();
    let nx = d.origX + dx; let ny = d.origY + dy;
    if (bounds) {
      nx = Math.max(0, Math.min(nx, bounds.width - win.rect.width));
      ny = Math.max(0, Math.min(ny, bounds.height - win.rect.height - 28));
    }
    moveWindow(win.id, nx, ny);
  };
  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    if (draggingRef.current) {
      saveWindowRect(win.id, win.rect);
    }
    draggingRef.current = null;
  };

  const onDoubleClickHeader = () => toggleMaximize(win.id);

  // Resize handle (bottom-right)
  const resizingRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const onMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (win.maximized) return;
    resizingRef.current = { startX: e.clientX, startY: e.clientY, origW: win.rect.width, origH: win.rect.height };
    window.addEventListener('mousemove', onMouseMoveResize);
    window.addEventListener('mouseup', onMouseUpResize, { once: true });
  };
  const onMouseMoveResize = (e: MouseEvent) => {
    const r = resizingRef.current; if (!r) return;
    const dx = e.clientX - r.startX; const dy = e.clientY - r.startY;
    const bounds = boundsRef.current?.getBoundingClientRect();
    let nw = Math.max(200, r.origW + dx);
    let nh = Math.max(120, r.origH + dy);
    if (bounds) {
      nw = Math.min(nw, bounds.width - win.rect.x);
      nh = Math.min(nh, bounds.height - win.rect.y - 28);
    }
    resizeWindow(win.id, nw, nh);
  };
  const onMouseUpResize = () => {
    window.removeEventListener('mousemove', onMouseMoveResize);
    if (resizingRef.current) {
      saveWindowRect(win.id, win.rect);
    }
    resizingRef.current = null;
  };

  const style = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = {
      position: 'absolute',
      left: win.maximized ? 0 : win.rect.x,
      top: win.maximized ? 0 : win.rect.y,
      width: win.maximized ? '100%' as const : win.rect.width,
      height: win.maximized ? '100%' as const : win.rect.height,
      zIndex: win.zIndex,
      border: '2px solid #00ff66', background: '#000', color: '#00ff66',
      display: win.minimized ? 'none' : 'flex', flexDirection: 'column',
      boxShadow: '0 0 0 1px rgba(0,255,102,0.2)',
    };
    return base;
  }, [win]);

  const onKeyDownWindow = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 10;
    if (e.key === 'Escape') {
      if (win.maximized) { toggleMaximize(win.id); }
      return;
    }
    if (!e.shiftKey || win.maximized) return;
    const bounds = boundsRef.current?.getBoundingClientRect();
    if (!bounds) return;
    e.preventDefault();
    let { width, height } = win.rect;
    if (e.key === 'ArrowRight') width = Math.min(bounds.width - win.rect.x, width + step);
    if (e.key === 'ArrowLeft') width = Math.max(200, width - step);
    if (e.key === 'ArrowDown') height = Math.min(bounds.height - win.rect.y - 28, height + step);
    if (e.key === 'ArrowUp') height = Math.max(120, height - step);
    resizeWindow(win.id, width, height);
    saveWindowRect(win.id, { ...win.rect, width, height });
  };

  return (
    <div style={style} role="dialog" aria-label={win.title} tabIndex={0} onKeyDown={onKeyDownWindow}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', borderBottom: '1px solid #00ff66', cursor: win.maximized ? 'default' : 'move' }}
        onMouseDown={onMouseDownHeader}
        onDoubleClick={onDoubleClickHeader}
      >
        <div>[ {win.title} ]</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => minimizeWindow(win.id)} aria-label="Minimize" style={{ background: 'transparent', color: 'inherit', border: '1px solid #00ff66', padding: '0 6px' }}>_</button>
          <button type="button" onClick={() => toggleMaximize(win.id)} aria-label="Maximize" style={{ background: 'transparent', color: 'inherit', border: '1px solid #00ff66', padding: '0 6px' }}>▢</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 6 }}>
        {win.content}
      </div>
      {!win.maximized ? (
        <div
          onMouseDown={onMouseDownResize}
          aria-hidden
          style={{ position: 'absolute', right: 0, bottom: 0, width: 14, height: 14, cursor: 'nwse-resize' }}
        />
      ) : null}
    </div>
  );
};


