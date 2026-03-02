export const sanitizeSurfaceItemOrder = (raw: unknown): Record<string, string[]> => {
  if (!raw || typeof raw !== 'object') return {};

  const sanitizedEntries = Object.entries(raw as Record<string, unknown>)
    .flatMap(([key, value]): Array<[string, string[]]> => {
      if (!Array.isArray(value)) return [];
      const ids = [...new Set(value.filter((entry: unknown): entry is string => typeof entry === 'string'))];
      return ids.length > 0 ? [[key, ids]] : [];
    });

  return Object.fromEntries(sanitizedEntries);
};

export const resolveSurfaceItemOrder = <T extends string>(
  defaultIds: readonly T[],
  persistedIds?: readonly string[]
): T[] => {
  const uniqueDefaultIds = [...new Set(defaultIds)];
  if (!persistedIds || persistedIds.length === 0) return [...uniqueDefaultIds];

  const allowed = new Set(uniqueDefaultIds);
  const resolved = persistedIds
    .filter((id): id is T => allowed.has(id as T))
    .filter((id, index, ids) => ids.indexOf(id) === index);

  for (const id of uniqueDefaultIds) {
    if (!resolved.includes(id)) resolved.push(id);
  }

  return resolved;
};

export const reorderSurfaceItemOrder = <T extends string>(
  ids: readonly T[],
  itemId: T,
  toIndex: number
): T[] => {
  const currentIndex = ids.indexOf(itemId);
  if (currentIndex < 0) return [...ids];

  const next = [...ids];
  const [moved] = next.splice(currentIndex, 1);
  if (!moved) return next;
  const boundedIndex = Math.min(Math.max(0, toIndex), next.length);
  next.splice(boundedIndex, 0, moved);
  return next;
};
