export type LocationCaseMode = 'upper' | 'mixed' | 'lower';

export const LOCATION_CASE_STORAGE_KEY = 'terminalOS.ui.v1.locationCase';

export const sanitizeLocationCaseMode = (value: unknown): LocationCaseMode => {
  if (value === 'upper' || value === 'mixed' || value === 'lower') return value;
  return 'upper';
};

export const nextLocationCaseMode = (current: LocationCaseMode): LocationCaseMode => {
  if (current === 'upper') return 'mixed';
  if (current === 'mixed') return 'lower';
  return 'upper';
};

export const toTextTransform = (mode: LocationCaseMode): 'uppercase' | 'none' | 'lowercase' => {
  if (mode === 'upper') return 'uppercase';
  if (mode === 'lower') return 'lowercase';
  return 'none';
};
