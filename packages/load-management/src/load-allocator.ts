import {
  AllocationReason,
  LoadAllocation,
  LoadChargerInput,
  LoadPlan,
  LoadPolicyInput,
} from './load-plan';

/**
 * Shares a site's power cap among its chargers (module 17, static load management). Every
 * charging charger gets its minimum first; idle chargers then get the same minimum as a
 * reserve while the cap allows, so a car plugging in starts at once; what is left goes to the
 * charging chargers, equally or by priority, each up to its own ceiling. When the minimums
 * alone exceed the cap they are scaled down and the plan says so. Pure: no clock, no database.
 */
export class LoadAllocator {
  allocate(policy: LoadPolicyInput, chargers: LoadChargerInput[]): LoadPlan {
    const ordered = LoadAllocator.ordered(chargers);
    const charging = ordered.filter((charger) => charger.isCharging);
    const idle = ordered.filter((charger) => !charger.isCharging);
    const floors = new Map(charging.map((c) => [c.chargerId, LoadAllocator.floorOf(policy, c)]));
    const floorTotal = [...floors.values()].reduce((sum, floor) => sum + floor, 0);
    if (floorTotal > policy.limitW) {
      return LoadAllocator.squeezed(policy, charging, idle, floors);
    }
    const caps = new Map(floors);
    let remaining = policy.limitW - floorTotal;
    for (const charger of idle) {
      const reserve = LoadAllocator.floorOf(policy, charger);
      const isFitting = reserve <= remaining;
      caps.set(charger.chargerId, isFitting ? reserve : 0);
      remaining -= isFitting ? reserve : 0;
    }
    const shares =
      policy.strategy === 'priority'
        ? LoadAllocator.byPriority(charging, floors, remaining)
        : LoadAllocator.equally(charging, floors, remaining);
    for (const [chargerId, share] of shares) {
      caps.set(chargerId, (caps.get(chargerId) ?? 0) + share);
    }
    return LoadAllocator.plan(ordered, caps, floors, false);
  }

  /** The least a charger is given while charging, or kept while idle: the policy's minimum, or less if it can take less. */
  private static floorOf(policy: LoadPolicyInput, charger: LoadChargerInput): number {
    return charger.maxPowerW === null
      ? policy.minPowerW
      : Math.min(policy.minPowerW, charger.maxPowerW);
  }

  /** The minimums alone do not fit: every charging charger gets its part of the cap, idle ones nothing. */
  private static squeezed(
    policy: LoadPolicyInput,
    charging: LoadChargerInput[],
    idle: LoadChargerInput[],
    floors: Map<string, number>,
  ): LoadPlan {
    const floorTotal = [...floors.values()].reduce((sum, floor) => sum + floor, 0);
    const allocations = [...charging, ...idle].map((charger) => {
      const floor = floors.get(charger.chargerId);
      return {
        chargerId: charger.chargerId,
        limitW: floor === undefined ? 0 : Math.floor((policy.limitW * floor) / floorTotal),
        reason: (floor === undefined ? 'waiting' : 'squeezed') as AllocationReason,
      };
    });
    return {
      allocations,
      allocatedW: allocations.reduce((sum, allocation) => sum + allocation.limitW, 0),
      isOverSubscribed: true,
    };
  }

  /** Water-filling: what is left is split equally, and a charger at its ceiling hands its surplus on. */
  private static equally(
    charging: LoadChargerInput[],
    floors: Map<string, number>,
    remaining: number,
  ): Map<string, number> {
    const shares = new Map(charging.map((charger) => [charger.chargerId, 0]));
    let open = charging.filter((charger) => LoadAllocator.headroom(charger, floors, shares) > 0);
    while (remaining > 0 && open.length > 0) {
      const each = Math.floor(remaining / open.length);
      if (each === 0) {
        break;
      }
      for (const charger of open) {
        const given = Math.min(each, LoadAllocator.headroom(charger, floors, shares));
        shares.set(charger.chargerId, (shares.get(charger.chargerId) ?? 0) + given);
        remaining -= given;
      }
      open = open.filter((charger) => LoadAllocator.headroom(charger, floors, shares) > 0);
    }
    return shares;
  }

  /** The most important charger first, each up to its ceiling, until nothing is left. */
  private static byPriority(
    charging: LoadChargerInput[],
    floors: Map<string, number>,
    remaining: number,
  ): Map<string, number> {
    const shares = new Map(charging.map((charger) => [charger.chargerId, 0]));
    for (const charger of charging) {
      const given = Math.min(remaining, LoadAllocator.headroom(charger, floors, shares));
      shares.set(charger.chargerId, given);
      remaining -= given;
    }
    return shares;
  }

  /** How much more a charger could take above its floor and what it already got. */
  private static headroom(
    charger: LoadChargerInput,
    floors: Map<string, number>,
    shares: Map<string, number>,
  ): number {
    if (charger.maxPowerW === null) {
      return Number.MAX_SAFE_INTEGER;
    }
    const taken = (floors.get(charger.chargerId) ?? 0) + (shares.get(charger.chargerId) ?? 0);
    return Math.max(0, charger.maxPowerW - taken);
  }

  private static plan(
    ordered: LoadChargerInput[],
    caps: Map<string, number>,
    floors: Map<string, number>,
    isOverSubscribed: boolean,
  ): LoadPlan {
    const allocations: LoadAllocation[] = ordered.map((charger) => {
      const limitW = caps.get(charger.chargerId) ?? 0;
      return {
        chargerId: charger.chargerId,
        limitW,
        reason: LoadAllocator.reasonOf(charger, limitW, floors),
      };
    });
    return {
      allocations,
      allocatedW: allocations.reduce((sum, allocation) => sum + allocation.limitW, 0),
      isOverSubscribed,
    };
  }

  private static reasonOf(
    charger: LoadChargerInput,
    limitW: number,
    floors: Map<string, number>,
  ): AllocationReason {
    if (!charger.isCharging) {
      return limitW > 0 ? 'idle' : 'waiting';
    }
    return limitW > (floors.get(charger.chargerId) ?? 0) ? 'share' : 'minimum';
  }

  /** Highest priority first, then by id, so the same input always gives the same plan. */
  private static ordered(chargers: LoadChargerInput[]): LoadChargerInput[] {
    return [...chargers].sort(
      (a, b) => b.priority - a.priority || a.chargerId.localeCompare(b.chargerId),
    );
  }
}
