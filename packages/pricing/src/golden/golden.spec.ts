import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PricingEngine } from '../pricing-engine';
import { GoldenCase, GoldenFile } from './golden-case';

const CASES_DIR = join(__dirname, 'cases');
const CASE_FILES = readdirSync(CASES_DIR).filter((file) => file.endsWith('.json'));

describe('PricingEngine golden cases', () => {
  const engine = new PricingEngine();

  it('has the cases the design lists', () => {
    expect(CASE_FILES).toEqual(
      expect.arrayContaining([
        'worked-example.json',
        'midnight-crossing.json',
        'dst-spring-forward.json',
        'dst-fall-back.json',
        'idle-over-cap.json',
        'meter-reset.json',
        'minimum-price.json',
        'maximum-price.json',
        'zero-energy-free.json',
        'three-day-session.json',
      ]),
    );
  });

  describe.each(CASE_FILES)('%s', (file) => {
    const golden = new GoldenCase(
      JSON.parse(readFileSync(join(CASES_DIR, file), 'utf8')) as GoldenFile,
    );
    const { lines, ...totals } = golden.file.expected;

    it(golden.file.name, () => {
      const result = engine.price(golden.file.tariff, golden.usage());

      expect(GoldenCase.linesOf(result)).toEqual(lines);
      expect(result).toMatchObject(totals);
    });

    it('gives the same result and hash on a second run', () => {
      const first = engine.price(golden.file.tariff, golden.usage());
      const second = engine.price(golden.file.tariff, golden.usage());

      expect(second).toEqual(first);
      expect(first.inputHash).toMatch(/^[0-9a-f]{16}$/);
      expect(first.engineVersion).toBe(PricingEngine.VERSION);
    });
  });
});
