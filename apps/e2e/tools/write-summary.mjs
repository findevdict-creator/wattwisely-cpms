// Turns Playwright's results.json into dist/e2e-report/summary.md and summary.json: the
// totals, each project, each module (from the @module-NN tags) and every failure with its
// first error line. CI appends the Markdown to the job summary.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

class E2eSummary {
  static REPORT = join(import.meta.dirname, '../../../dist/e2e-report');
  static COLOURS = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

  constructor(results) {
    this.tests = E2eSummary.flatten(results.suites ?? [], []);
  }

  static flatten(suites, titles) {
    return suites.flatMap((suite) => [
      ...E2eSummary.flatten(suite.suites ?? [], [...titles, suite.title]),
      ...(suite.specs ?? []).flatMap((spec) =>
        spec.tests.map((test) => E2eSummary.row(spec, test, titles)),
      ),
    ]);
  }

  static row(spec, test, titles) {
    const result = test.results.at(-1) ?? { status: 'skipped', errors: [], annotations: [] };
    const notes = [...(test.annotations ?? []), ...(result.annotations ?? [])].map(
      (a) => `${a.type}: ${a.description ?? ''}`,
    );
    return {
      project: test.projectName,
      file: spec.file,
      title: [...titles.slice(1), spec.title].filter(Boolean).join(' › '),
      modules: (spec.tags ?? [])
        .filter((tag) => tag.startsWith('module-'))
        .map((tag) => Number(tag.slice(7))),
      status: result.status === 'timedOut' ? 'failed' : result.status,
      seconds: Math.round((result.duration ?? 0) / 100) / 10,
      error: (result.errors?.[0]?.message ?? '').replace(E2eSummary.COLOURS, '').split('\n')[0],
      notes: [...new Set(notes)],
    };
  }

  static count(rows) {
    const totals = { total: rows.length, passed: 0, failed: 0, skipped: 0 };
    for (const row of rows) {
      totals[
        row.status === 'passed' ? 'passed' : row.status === 'skipped' ? 'skipped' : 'failed'
      ] += 1;
    }
    return totals;
  }

  groupBy(keyOf) {
    const groups = new Map();
    for (const test of this.tests) {
      for (const key of [keyOf(test)].flat()) {
        groups.set(key, [...(groups.get(key) ?? []), test]);
      }
    }
    return [...groups.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, rows]) => ({ key, ...E2eSummary.count(rows) }));
  }

  toJson() {
    return {
      totals: E2eSummary.count(this.tests),
      projects: this.groupBy((test) => test.project),
      modules: this.groupBy((test) => test.modules),
      tests: this.tests,
    };
  }

  toMarkdown() {
    const { totals, projects, modules } = this.toJson();
    const table = (rows, label) => [
      `| ${label} | Tests | Passed | Failed | Skipped |`,
      '|---|---:|---:|---:|---:|',
      ...rows.map((r) => `| ${r.key} | ${r.total} | ${r.passed} | ${r.failed} | ${r.skipped} |`),
    ];
    const failures = this.tests
      .filter((test) => test.status === 'failed')
      .map((test) => `- **${test.project}** ${test.title}: ${test.error}`);
    return [
      '# End-to-end test summary',
      '',
      `${totals.total} tests: ${totals.passed} passed, ${totals.failed} failed, ${totals.skipped} skipped.`,
      '',
      '## By project',
      ...table(projects, 'Project'),
      '',
      '## By module',
      ...table(
        modules.map((m) => ({ ...m, key: `Module ${m.key}` })),
        'Module',
      ),
      '',
      '## Failures',
      ...(failures.length ? failures : ['None.']),
      '',
    ].join('\n');
  }

  static run() {
    const results = JSON.parse(readFileSync(join(E2eSummary.REPORT, 'results.json'), 'utf8'));
    const summary = new E2eSummary(results);
    writeFileSync(
      join(E2eSummary.REPORT, 'summary.json'),
      `${JSON.stringify(summary.toJson(), null, 2)}\n`,
    );
    writeFileSync(join(E2eSummary.REPORT, 'summary.md'), summary.toMarkdown());
    process.stdout.write(summary.toMarkdown());
  }
}

E2eSummary.run();
