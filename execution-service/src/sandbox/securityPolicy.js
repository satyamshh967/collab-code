const MAX_CODE_LENGTH = 50000;

const LANGUAGE_ALIASES = {
  js: 'javascript',
  javascript: 'javascript',
  py: 'python',
  python: 'python',
  java: 'java'
};

/**
 * Normalize a user-supplied language identifier to its canonical name.
 * Returns null for unsupported languages.
 */
export const normalizeLanguage = (language) => {
  if (typeof language !== 'string') return null;
  return LANGUAGE_ALIASES[language.trim().toLowerCase()] || null;
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_ALIASES);

const PY_BLOCKED_MODULES = '(os|subprocess|sys|shutil|socket|requests|urllib|pty|ctypes|importlib|multiprocessing)';
const JS_BLOCKED_MODULES = '(child_process|fs|os|net|http|https|cluster|v8|worker_threads|dgram|vm)';

const rules = {
  python: [
    // `import os`, `import math, os`, `import os.path`
    new RegExp(`\\bimport\\s+(?:[\\w.]+\\s*,\\s*)*${PY_BLOCKED_MODULES}\\b`, 'i'),
    new RegExp(`\\bfrom\\s+${PY_BLOCKED_MODULES}\\b[\\w.]*\\s+import`, 'i'),
    /\bopen\s*\(/i,
    /\beval\s*\(/i,
    /\bexec\s*\(/i,
    /\b__import__\s*\(/i
  ],
  javascript: [
    new RegExp(`require\\s*\\(\\s*['"\`](?:node:)?${JS_BLOCKED_MODULES}['"\`]\\s*\\)`, 'i'),
    new RegExp(`import\\s+[^;]*?from\\s+['"](?:node:)?${JS_BLOCKED_MODULES}['"]`, 'i'),
    new RegExp(`import\\s*\\(\\s*['"\`](?:node:)?${JS_BLOCKED_MODULES}['"\`]\\s*\\)`, 'i'),
    /\bprocess\.(exit|kill|env|binding|dlopen|mainModule)\b/i,
    /\beval\s*\(/i,
    /\bFunction\s*\(/i
  ],
  java: [
    /Runtime\.getRuntime\s*\(\s*\)/i,
    /ProcessBuilder/i,
    /System\.exit/i,
    /java\.io\.File/i,
    /java\.nio\.file/i,
    /java\.net\./i
  ]
};

/**
 * Static deny-list check. This is a defence-in-depth layer only: the real
 * isolation boundary is the container sandbox (no network, memory/CPU/pid caps).
 */
export const validateCode = (code, language) => {
  if (typeof code !== 'string') {
    return { valid: false, reason: 'Code must be a string.' };
  }

  if (code.length > MAX_CODE_LENGTH) {
    return { valid: false, reason: 'Code exceeds maximum allowed length.' };
  }

  const lang = normalizeLanguage(language);
  if (!lang) {
    return { valid: false, reason: `Unsupported language: ${language}` };
  }

  for (const regex of rules[lang]) {
    if (regex.test(code)) {
      return { valid: false, reason: `Usage of restricted security pattern: ${regex.source}` };
    }
  }

  return { valid: true };
};
