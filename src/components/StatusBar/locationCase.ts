export type LocationCaseMode = 'upper' | 'lower';

export const LOCATION_CASE_STORAGE_KEY = 'terminalOS.ui.v1.locationCase';

export const sanitizeLocationCaseMode = (value: unknown): LocationCaseMode => {
  if (value === 'upper' || value === 'lower') return value;
  return 'upper';
};

export const nextLocationCaseMode = (current: LocationCaseMode): LocationCaseMode => {
  if (current === 'upper') return 'lower';
  return 'upper';
};

export const toTextTransform = (mode: LocationCaseMode): 'uppercase' | 'lowercase' => {
  if (mode === 'upper') return 'uppercase';
  return 'lowercase';
};
