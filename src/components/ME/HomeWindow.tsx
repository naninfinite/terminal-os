import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HomeItem, loadHomeItems, saveHomeItems } from './homeModel';
import { ITEMS_UPDATED_EVENT, emitHomeItemsUpdated } from './homeModel';

const HomeWindow: React.FC = () => {
  const [items, setItems] = useState<HomeItem[]>(() => loadHomeItems());
  const dragIndexRef = useRef<number | null>(null);

  useEffect(() => {
    // sync if another window updates
    const onUpdated = () => setItems(loadHomeItems());
    window.addEventListener(ITEMS_UPDATED_EVENT, onUpdated as EventListener);
    return () => window.removeEventListener(ITEMS_UPDATED_EVENT, onUpdated as EventListener);
  }, []);

  const onDragStart = useCallback((idx: number) => {
    dragIndexRef.current = idx;
  }, []);

  const onDrop = useCallback((idx: number) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from == null || from === idx) return;
    setItems(prev => {
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(idx, 0, moved);
      saveHomeItems(next);
      emitHomeItemsUpdated();
      return next;
    });
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 6 }}>HOME ITEMS (drag to reorder)</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {items.map((it, idx) => (
          <li key={it.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(idx)}
              aria-label={`${it.name} — drag to change order`}
              style={{ border: '1px solid #00ff66', padding: 6, background: '#000' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>[ {it.name} ]</div>
            <div style={{ opacity: 0.9, fontSize: '12px' }}>{it.preview ?? '—'}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HomeWindow;


