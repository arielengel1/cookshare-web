/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/**/*.test.ts'],
  setupFiles: ['dotenv/config'],
  coverageDirectory: 'coverage',
  coverageReporters: ['json-summary', 'text', 'html'],
};
