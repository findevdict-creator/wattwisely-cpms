// Fails the image build when a bundle requires a package that is not installed.
// Webpack leaves every npm package out of main.js, so the runtime image only works
// if the app's own package.json lists each one. A missing entry used to pass the
// build and crash the container on start ("Cannot find module 'pdfkit'").
//
// Usage, from the runtime image's /app after `npm ci`:
//   node /tmp/check-bundle-requires.cjs main.js migrate.js
const { readFileSync, existsSync } = require('node:fs');
const { builtinModules } = require('node:module');
const { resolve } = require('node:path');

const BUILTINS = new Set(builtinModules);
const REQUIRE_CALL = /\brequire\("([^".][^"]*)"\)/g;

class BundleRequireCheck {
  static run(bundles) {
    const missing = bundles
      .filter((bundle) => existsSync(bundle))
      .flatMap((bundle) => BundleRequireCheck.missingIn(bundle));
    if (missing.length === 0) return;
    console.error('These packages are required by the bundle but not installed:');
    missing.forEach((line) => console.error(`  ${line}`));
    console.error("Add them to the app's package.json (apps/<app>/package.json).");
    process.exit(1);
  }

  static missingIn(bundle) {
    const source = readFileSync(bundle, 'utf8');
    const names = new Set([...source.matchAll(REQUIRE_CALL)].map((match) => match[1]));
    return [...names]
      .filter((name) => !name.startsWith('node:') && !BUILTINS.has(name))
      .filter((name) => !BundleRequireCheck.isResolvable(name))
      .map((name) => `${name} (from ${bundle})`);
  }

  static isResolvable(name) {
    try {
      require.resolve(name, { paths: [resolve('.')] });
      return true;
    } catch {
      return false;
    }
  }
}

BundleRequireCheck.run(process.argv.slice(2));
