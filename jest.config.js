module.exports = {
  testEnvironment: 'node',
  extraGlobals: ['Math'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  collectCoverageFrom: ['**/*.ts', '!**/*.d.ts', '!**/lib/index.ts'],
  transform: {
    '\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['./packages/image/test/utils.js'],
  transformIgnorePatterns: ['/node_modules/(?!@tensorflow).*/'],
  testPathIgnorePatterns: ['/node_modules/', 'shared-image.test.ts'],
  testMatch: ['**/*.test.js', '**/*.test.ts'],
}
