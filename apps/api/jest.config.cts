module.exports = {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  // Each flow suite migrates its own database and seeds it in beforeAll; on a busy CI runner
  // (API, gateway and worker tests at once) that can pass Jest's 5 s default.
  testTimeout: 30000,
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  // These packages ship as ES modules, so Jest must compile them too.
  transformIgnorePatterns: ['node_modules/(?!(jose|content-disposition)/)'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
};
