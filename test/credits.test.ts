import { describe, expect, it } from "vitest";
import { dollarsToUnits, splitHold, tokenPrice, unitsToCents } from "@/lib/credits";

describe("credits", () => {
  it("converts $1 to 2 credits (200 units) and back", () => {
    expect(dollarsToUnits(1)).toBe(200);
    expect(dollarsToUnits(12.34)).toBe(2468);
    expect(unitsToCents(2468)).toBe(1234);
  });

  it("rounds token price up", () => {
    expect(tokenPrice(10_000, 150)).toBe(150);
    expect(tokenPrice(1, 150)).toBe(1);
    expect(tokenPrice(0, 150)).toBe(0);
    expect(tokenPrice(3333, 100)).toBe(34);
  });

  it("split always sums to the hold", () => {
    for (const [cap, rate, tokens] of [[20_000, 137, 0], [20_000, 137, 1], [20_000, 137, 12_345], [20_000, 137, 20_000], [20_000, 137, 999_999], [7, 3, 5]]) {
      const held = tokenPrice(cap, rate);
      const { charged, refund } = splitHold(held, tokens, cap, rate);
      expect(charged + refund).toBe(held);
      expect(charged).toBe(tokenPrice(Math.min(tokens, cap), rate));
      expect(refund).toBeGreaterThanOrEqual(0);
    }
  });
});
