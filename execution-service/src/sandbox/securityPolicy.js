const MAX_CODE_LENGTH = 50000;

export const validateCode = (code, language) => {
  if (code.length > MAX_CODE_LENGTH) {
    return { valid: false, reason: 'Code exceeds maximum allowed length.' };
  }

  const blockedPatterns = {
    python: [
      'import os',
      'import subprocess',
      'import sys',
      'open(',
      'eval(',
      'exec('
    ],
    javascript: [
      'require("child_process")',
      'require("fs")',
      'require("os")',
      'eval('
    ],
    java: [
      'java.lang.Runtime',
      'java.lang.ProcessBuilder',
      'java.io.File',
      'java.nio.file'
    ]
  };

  const lang = language.toLowerCase();
  const patterns = blockedPatterns[lang] || [];

  for (const pattern of patterns) {
    if (code.includes(pattern)) {
      return { valid: false, reason: `Usage of restricted keyword/pattern: ${pattern}` };
    }
  }

  return { valid: true };
};
