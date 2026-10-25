module.exports = {
  displayName: 'worker',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  // Each flow suite migrates its own database and boots the worker in beforeAll; on a busy
  // CI runner (API, gateway and worker tests at once) that can pass Jest's 5 s default.
  testTimeout: 30000,
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageDirectory: '../../coverage/apps/worker',
};
