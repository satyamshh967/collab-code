const MAX_CODE_LENGTH = 50000;

export const validateCode = (code, language) => {
  if (code.length > MAX_CODE_LENGTH) {
    return { valid: false, reason: 'Code exceeds maximum allowed length.' };
  }

  const lang = (language || '').toLowerCase();

  const rules = {
    python: [
      /\bimport\s+(os|subprocess|sys|shutil|socket|requests|urllib|pty)/i,
      /\bfrom\s+(os|subprocess|sys|shutil|socket|requests|urllib|pty)\s+import/i,
      /\bopen\s*\(/i,
      /\beval\s*\(/i,
      /\bexec\s*\(/i,
      /\b__import__\s*\(/i
    ],
    javascript: [
      /require\s*\(\s*['"](child_process|fs|os|net|http|https|cluster|v8)['"]\s*\)/i,
      /import\s+.*\s+from\s+['"](child_process|fs|os|net|http|https|cluster|v8)['"]/i,
      /\bprocess\.(exit|kill|env|binding|dlopen)\b/i,
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

  const patterns = rules[lang] || [];

  for (const regex of patterns) {
    if (regex.test(code)) {
      return { valid: false, reason: `Usage of restricted security pattern: ${regex.source}` };
    }
  }

  return { valid: true };
};
