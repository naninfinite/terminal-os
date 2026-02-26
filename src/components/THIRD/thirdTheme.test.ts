import { describe, expect, it } from 'vitest';
import {
  getThirdThemePalette,
  resolveThirdMaterialColorHex,
} from './thirdTheme';

describe('thirdTheme helpers', () => {
  it('resolves theme-specific grid and default material colors', () => {
    const dark = getThirdThemePalette('dark');
    const light = getThirdThemePalette('light');

    expect(dark.grid).toBe(0x00ff66);
    expect(dark.materialDefault).toBe(0x00ff66);
    expect(dark.gridOpacity).toBe(0.45);
    expect(light.grid).toBe(0x101010);
    expect(light.materialDefault).toBe(0x101010);
    expect(light.gridOpacity).toBe(0.82);
  });

  it('maps legacy default material color to theme default fallback', () => {
    expect(resolveThirdMaterialColorHex('#00ff66', 0x101010)).toBe(0x101010);
    expect(resolveThirdMaterialColorHex('#00FF66', 0x101010)).toBe(0x101010);
  });

  it('keeps explicit custom colors and sanitizes invalid values', () => {
    expect(resolveThirdMaterialColorHex('#ff7eb6', 0x101010)).toBe(0xff7eb6);
    expect(resolveThirdMaterialColorHex('invalid', 0x101010)).toBe(0x101010);
  });
});
