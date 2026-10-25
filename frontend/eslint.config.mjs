// ESLint 9 düz yapılandırma (Aşama 2: CRA'nın `eslint-config-react-app`'i kalktı; Aşama 4: TypeScript dosyaları eklendi).
// Amaç CRA'daki davranışı korumak: tanımsız değişken hata, React Hook kuralları (bağımlılık dizisi uyarı),
// kullanılmayan değişken uyarı. TypeScript dosyalarında ek olarak `any` yasak (hata).
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const ortakKurallar = {
  // JSX'te kullanılan bileşenler "kullanılmayan değişken" sayılmasın
  'react/jsx-uses-vars': 'error',
  'react/jsx-uses-react': 'warn',
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  // Boş catch bilerek kullanılır (en iyi çaba işlemleri); boş if/else/döngü gövdesi hata kalır
  'no-empty': ['error', { allowEmptyCatch: true }],
};

export default tseslint.config(
  { ignores: ['build/**', 'dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...ortakKurallar,
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
    },
  },
  {
    // TypeScript: tanımsız değişkeni derleyici yakalar (no-undef kapanır); `any` yasak.
    files: ['src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    settings: { react: { version: 'detect' } },
    rules: {
      ...ortakKurallar,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
    },
  },
  {
    // Testler Vitest globallerini (describe, test, expect, vi...) ve Node'u (require, __dirname) kullanır
    files: ['**/*.test.{js,jsx,ts,tsx}', 'src/setupTests.{js,ts}'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
);
