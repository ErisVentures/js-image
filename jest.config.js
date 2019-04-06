module.exports = {
  collectCoverageFrom: ['**/*.ts', '!**/*.d.ts', '!**/lib/index.ts'],
  transform: {
    '\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testPathIgnorePatterns: ['/node_modules/', '/test/steps/'],
  testMatch: ['**/exif/**/*.test.js'],
}
