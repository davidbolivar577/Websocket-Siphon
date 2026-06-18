import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        // Explicitly tells ESLint that chrome API objects exist globally in our background scripts
        chrome: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly'
      }
    },
    rules: {
      // Prevents generic 'any' data types from leaking silently into your pipelines
      '@typescript-eslint/no-explicit-any': 'warn',
      // Catch dead code before bundling it out to production
      'no-unused-vars': 'off', // turned off to let TS rule handle it
      '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'no-console': 'off' // Allowed since this is a developer utility
    }
  }
);