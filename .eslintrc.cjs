/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json'], // optional but better types
    },
    env: {
        node: true,
        es2021: true,
    },
    plugins: ['@typescript-eslint', 'prettier'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        // If you want rules that use type info:
        // 'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:prettier/recommended', // enables eslint-plugin-prettier & config
    ],
    rules: {
        // Prettier errors show as ESLint errors:
        'prettier/prettier': 'error',

        // You can loosen or tighten TS rules here:
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'off'
    },
    ignorePatterns: ['dist/', 'node_modules/']
};
