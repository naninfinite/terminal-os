import { describe, expect, it } from 'vitest';
import {
  classifyDesktopRuntimeError,
  createDesktopRuntimeDiagnostic,
} from './desktopRuntimeError';

describe('desktopRuntimeError', () => {
  it('classifies dynamic import fetch failures', () => {
    expect(
      classifyDesktopRuntimeError(new Error('Failed to fetch dynamically imported module'))
    ).toBe('fetch');
    expect(
      classifyDesktopRuntimeError('Importing a module script failed')
    ).toBe('fetch');
  });

  it('classifies non-fetch Error instances as runtime failures', () => {
    expect(
      classifyDesktopRuntimeError(new Error('Desktop runtime exploded'))
    ).toBe('runtime');
  });

  it('classifies non-Error rejections as unknown failures', () => {
    expect(classifyDesktopRuntimeError({ code: 'E_BROKEN' })).toBe('unknown');
  });

  it('creates a normalized diagnostic payload', () => {
    const diagnostic = createDesktopRuntimeDiagnostic(new Error('error loading dynamically imported module'));

    expect(diagnostic.kind).toBe('fetch');
    expect(diagnostic.name).toBe('Error');
    expect(diagnostic.message).toBe('error loading dynamically imported module');
    expect(diagnostic.stack).toEqual(expect.any(String));
  });
});
