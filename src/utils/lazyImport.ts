export const createRetriableLazyImport = <T>(loader: () => Promise<T>): (() => Promise<T>) => {
  let cachedPromise: Promise<T> | null = null;

  return () => {
    if (cachedPromise) return cachedPromise;

    const nextPromise = loader().catch((error) => {
      if (cachedPromise === nextPromise) {
        cachedPromise = null;
      }
      throw error;
    });

    cachedPromise = nextPromise;
    return nextPromise;
  };
};
