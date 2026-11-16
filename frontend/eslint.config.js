import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      // Text must never be set as markup (BR1.5).
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Use textContent; text is never markup (BR1.5).' },
        { property: 'outerHTML', message: 'Use textContent; text is never markup (BR1.5).' },
        { property: 'insertAdjacentHTML', message: 'Use textContent (BR1.5).' },
      ],
    },
  },
);
