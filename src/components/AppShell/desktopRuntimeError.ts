export type DesktopLoadErrorKind = 'fetch' | 'runtime' | 'unknown';

const FETCH_FAILURE_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
];

export type DesktopRuntimeDiagnostic = {
  kind: DesktopLoadErrorKind;
  name: string;
  message: string;
  stack?: string;
};

export const getDesktopRuntimeErrorMessage = (error: unknown): string => {
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  try {
    const serializedError = String(error ?? '').trim();
    return serializedError || 'Unknown desktop runtime failure';
  } catch (serializationError) {
    return 'Unknown desktop runtime failure';
  }
};

export const classifyDesktopRuntimeError = (error: unknown): DesktopLoadErrorKind => {
  const message = getDesktopRuntimeErrorMessage(error);

  if (FETCH_FAILURE_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'fetch';
  }

  if (error instanceof Error) {
    return 'runtime';
  }

  return 'unknown';
};

export const createDesktopRuntimeDiagnostic = (error: unknown): DesktopRuntimeDiagnostic => ({
  kind: classifyDesktopRuntimeError(error),
  name: error instanceof Error ? error.name : 'UnknownError',
  message: getDesktopRuntimeErrorMessage(error),
  stack: error instanceof Error ? error.stack : undefined,
});
