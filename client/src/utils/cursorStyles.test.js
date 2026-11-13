import { sanitizeCssColor, escapeCssString } from './cursorStyles';

describe('remote cursor CSS sanitization', () => {
  it('accepts plain 6-digit hex colors', () => {
    expect(sanitizeCssColor('#3b82f6')).toBe('#3b82f6');
  });

  it('replaces anything that is not a plain hex color', () => {
    expect(sanitizeCssColor('red} body{display:none')).toBe('#38bdf8');
    expect(sanitizeCssColor('#fff')).toBe('#38bdf8');
    expect(sanitizeCssColor(undefined)).toBe('#38bdf8');
  });

  it('escapes characters that could terminate the CSS string or rule', () => {
    const escaped = escapeCssString('a"}\n\\b');
    expect(escaped).not.toMatch(/["}\n]/);
    expect(escaped.startsWith('a')).toBe(true);
    expect(escaped).toContain('\\22 '); // escaped double quote
  });

  it('keeps ordinary names readable and caps length', () => {
    expect(escapeCssString('Happy Coder-42')).toBe('Happy Coder-42');
    expect(escapeCssString('x'.repeat(100))).toHaveLength(40);
  });
});
