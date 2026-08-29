module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
        'wip',
        'release',
      ],
    ],
    'body-max-line-length': [2, 'always', 200],
    'scope-enum': [2, 'always', ['@axonpack/expo-devtools', 'linter', 'docs']],
  },
};
