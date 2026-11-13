const DEFAULT_CURSOR_COLOR = '#38bdf8';

// Remote cursor labels are rendered via generated CSS, and the values come from
// other peers' awareness state, so they must never be trusted verbatim.

// Only plain hex colors are allowed; anything else could break out of the
// generated CSS rule (e.g. "red} body{display:none").
export const sanitizeCssColor = (color) =>
  (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_CURSOR_COLOR);

// Escape a value for use inside a double-quoted CSS string: every character
// outside a safe set becomes a CSS hex escape, and the length is capped.
export const escapeCssString = (value) =>
  Array.from(String(value).slice(0, 40))
    .map((ch) => (/[\w .@-]/.test(ch) ? ch : `\\${ch.codePointAt(0).toString(16)} `))
    .join('');
