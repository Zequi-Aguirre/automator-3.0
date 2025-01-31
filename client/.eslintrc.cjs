module.exports = {
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist/'],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  overrides: [
    {
      files: ['*.js', '*.jsx', '*.ts', '*.tsx'],
      extends: 'standard-with-typescript',
      rules: {
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/strict-boolean-expressions": 0,
        "@typescript-eslint/member-delimiter-style": "off",
        '@typescript-eslint/no-floating-promises': "off",
        '@typescript-eslint/no-misused-promises': "off",
        '@typescript-eslint/quotes': 'off',
        '@typescript-eslint/space-before-blocks': 'off',
        '@typescript-eslint/semi': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/space-before-function-paren': 'off',
        '@typescript-eslint/key-spacing': 'off',
        '@typescript-eslint/comma-spacing': 'off',
        'no-unneeded-ternary': 'off',
        '@typescript-eslint/comma-dangle': 'off',
        '@typescript-eslint/object-curly-spacing': 'off',
        'array-bracket-spacing': 'off',
        '@typescript-eslint/block-spacing': 'off',
        ' @typescript-eslint/keyword-spacing': 'off',
        'arrow-spacing': 'off',
        '@typescript-eslint/type-annotation-spacing': 'off',
        '@typescript-eslint/consistent-type-definitions': 'off',
        'padded-blocks': 'off',
        'quote-props': 'off',
        'eol-last': 'off',
        '@typescript-eslint/indent': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/array-type': 'off',
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
         "no-constant-binary-expression": "error"
      }
    }
  ],

  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
    '@typescript-eslint/no-non-null-assertion': 'off',
    "@typescript-eslint/member-delimiter-style": "off",
  },
}
