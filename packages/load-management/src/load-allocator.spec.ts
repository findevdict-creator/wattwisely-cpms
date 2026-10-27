import { LoadAllocator } from './load-allocator';
import { LoadChargerInput, LoadPolicyInput } from './load-plan';

describe('LoadAllocator', () => {
  const allocator = new LoadAllocator();
  const policy: LoadPolicyInput = { limitW: 50_000, minPowerW: 4_200, strategy: 'equal_share' };

  const charger = (
    id: string,
    isCharging: boolean,
    extra: Partial<LoadChargerInput> = {},
  ): LoadChargerInput => ({
    chargerId: id,
    priority: 5,
    maxPowerW: 22_000,
    isCharging,
    ...extra,
  });

  it('shares the cap equally among charging chargers, up to each one’s ceiling', () => {
    const plan = allocator.allocate(policy, [
      charger('a', true),
      charger('b', true),
      charger('c', true, { maxPowerW: 11_000 }),
    ]);

    expect(plan.allocations).toEqual([
      { chargerId: 'a', limitW: 19_500, reason: 'share' },
      { chargerId: 'b', limitW: 19_500, reason: 'share' },
      { chargerId: 'c', limitW: 11_000, reason: 'share' },
    ]);
    expect(plan.allocatedW).toBe(50_000);
    expect(plan.isOverSubscribed).toBe(false);
  });

  it('keeps a reserve on idle chargers while the cap allows, and gives the rest to the charging ones', () => {
    const plan = allocator.allocate(policy, [
      charger('a', true),
      charger('b', false),
      charger('c', false),
    ]);

    expect(plan.allocations).toEqual([
      { chargerId: 'a', limitW: 22_000, reason: 'share' },
      { chargerId: 'b', limitW: 4_200, reason: 'idle' },
      { chargerId: 'c', limitW: 4_200, reason: 'idle' },
    ]);
    expect(plan.allocatedW).toBe(30_400);
  });

  it('serves by priority when asked, the most important charger first', () => {
    const plan = allocator.allocate({ ...policy, strategy: 'priority', limitW: 30_000 }, [
      charger('a', true, { priority: 3 }),
      charger('b', true, { priority: 9 }),
      charger('c', true, { priority: 9 }),
    ]);

    expect(plan.allocations).toEqual([
      { chargerId: 'b', limitW: 21_600, reason: 'share' },
      { chargerId: 'c', limitW: 4_200, reason: 'minimum' },
      { chargerId: 'a', limitW: 4_200, reason: 'minimum' },
    ]);
    expect(plan.allocatedW).toBe(30_000);
  });

  it('leaves idle chargers waiting when the minimums take the whole cap', () => {
    const plan = allocator.allocate({ ...policy, limitW: 9_000 }, [
      charger('a', true),
      charger('b', true),
      charger('c', false),
    ]);

    expect(plan.allocations).toEqual([
      { chargerId: 'a', limitW: 4_500, reason: 'share' },
      { chargerId: 'b', limitW: 4_500, reason: 'share' },
      { chargerId: 'c', limitW: 0, reason: 'waiting' },
    ]);
    expect(plan.isOverSubscribed).toBe(false);
  });

  it('squeezes the minimums when even they do not fit, and says so', () => {
    const plan = allocator.allocate({ ...policy, limitW: 6_000 }, [
      charger('a', true),
      charger('b', true),
      charger('c', false),
    ]);

    expect(plan.allocations).toEqual([
      { chargerId: 'a', limitW: 3_000, reason: 'squeezed' },
      { chargerId: 'b', limitW: 3_000, reason: 'squeezed' },
      { chargerId: 'c', limitW: 0, reason: 'waiting' },
    ]);
    expect(plan.isOverSubscribed).toBe(true);
  });

  it('never gives a charger more than its ceiling, and a charger without one takes what is left', () => {
    const plan = allocator.allocate({ ...policy, limitW: 100_000 }, [
      charger('a', true, { maxPowerW: 7_400 }),
      charger('b', true, { maxPowerW: null }),
    ]);

    expect(plan.allocations).toEqual([
      { chargerId: 'a', limitW: 7_400, reason: 'share' },
      { chargerId: 'b', limitW: 92_600, reason: 'share' },
    ]);
  });

  it('uses a charger’s ceiling as its minimum when the ceiling is lower', () => {
    const plan = allocator.allocate({ ...policy, limitW: 5_000 }, [
      charger('a', true, { maxPowerW: 3_700 }),
      charger('b', false, { maxPowerW: 1_000 }),
    ]);

    expect(plan.allocations).toEqual([
      { chargerId: 'a', limitW: 3_700, reason: 'minimum' },
      { chargerId: 'b', limitW: 1_000, reason: 'idle' },
    ]);
  });

  it('gives an empty site an empty plan', () => {
    expect(allocator.allocate(policy, [])).toEqual({
      allocations: [],
      allocatedW: 0,
      isOverSubscribed: false,
    });
  });
});
