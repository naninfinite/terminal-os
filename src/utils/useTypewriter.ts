import { useEffect, useMemo, useState } from 'react';

export function useTypewriter(text: string, speedMs: number = 50) {
  const characters = useMemo(() => Array.from(text), [text]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (characters.length === 0) return;
    const id = setInterval(() => {
      setIndex((i) => Math.min(i + 1, characters.length));
    }, speedMs);
    return () => clearInterval(id);
  }, [characters, speedMs]);

  return characters.slice(0, index).join('');
}




