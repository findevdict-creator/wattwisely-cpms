const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/api'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      // migrate.js applies database migrations before the API starts (deploy/scripts/up.sh).
      additionalEntryPoints: [{ entryName: 'migrate', entryPath: './src/migrate.ts' }],
      tsConfig: './tsconfig.app.json',
      assets: [
        './src/assets',
        { input: '../../packages/db/migrations', glob: '**/*', output: 'migrations' },
      ],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMap: true,
    }),
  ],
};
