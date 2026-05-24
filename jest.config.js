module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/docs/**',
  ],
  setupFilesAfterSetup: ['./tests/setup.js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetModules: true,
};
