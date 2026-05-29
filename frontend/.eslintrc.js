export default {
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: '18.3'
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx']
      },
      alias: {
        map: [
          ['@', './src'],
          ['@components', './src/components'],
          ['@pages', './src/pages'],
          ['@hooks', './src/hooks'],
          ['@context', './src/context'],
          ['@services', './src/services'],
          ['@store', './src/store'],
          ['@utils', './src/utils'],
          ['@styles', './src/styles'],
          ['@routes', './src/routes'],
          ['@assets', './src/assets']
        ]
      }
    }
  },
  plugins: ['react', 'react-hooks', 'import', 'jsx-a11y'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true }
      }
    ],
    'react/self-closing-comp': ['error', {
      component: true,
      html: true
    }],
    'react/jsx-boolean-value': ['error', 'never'],
    'react/jsx-curly-brace-presence': ['error', {
      props: 'never',
      children: 'never'
    }]
  }
};