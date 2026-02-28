import { describe, expect, it, vi } from 'vitest';
import { createRetriableLazyImport } from './lazyImport';

describe('createRetriableLazyImport', () => {
  it('caches the first pending import and reuses it while pending', async () => {
    const resolveImports: Array<(value: string) => void> = [];
    const loader = vi.fn(() => new Promise<string>((resolve) => {
      resolveImports.push(resolve);
    }));
    const load = createRetriableLazyImport(loader);

    const first = load();
    const second = load();

    expect(first).toBe(second);
    expect(loader).toHaveBeenCalledTimes(1);

    resolveImports[0]?.('ready');
    await expect(first).resolves.toBe('ready');
  });

  it('keeps the resolved import cached', async () => {
    const loader = vi.fn(async () => 'ready');
    const load = createRetriableLazyImport(loader);

    const first = await load();
    const second = await load();

    expect(first).toBe('ready');
    expect(second).toBe('ready');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('clears the cache after a rejected import so the next call retries', async () => {
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValueOnce('recovered');
    const load = createRetriableLazyImport(loader);

    await expect(load()).rejects.toThrow('first failure');
    await expect(load()).resolves.toBe('recovered');

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('shares a rejected pending import and still retries on the next call', async () => {
    const rejectImports: Array<(reason?: unknown) => void> = [];
    const loader = vi.fn()
      .mockImplementationOnce(() => new Promise<string>((_, reject) => {
        rejectImports.push(reject);
      }))
      .mockResolvedValueOnce('second pass');
    const load = createRetriableLazyImport(loader);

    const first = load();
    const second = load();
    expect(first).toBe(second);

    rejectImports[0]?.(new Error('boom'));
    await expect(first).rejects.toThrow('boom');
    await expect(load()).resolves.toBe('second pass');
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
