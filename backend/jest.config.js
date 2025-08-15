module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!server.js',
    '!config/database.js',
    '!uploads/**',
    '!__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/uploads/'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.js'
  ],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  globalSetup: '<rootDir>/__tests__/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/globalTeardown.js'
};
