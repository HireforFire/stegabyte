import { describe, expect, it } from "vitest";
import { computeScore } from "@/components/ui/password-strength";

describe("password-strength.computeScore", () => {
  it("returns 0 for empty", () => {
    expect(computeScore("")).toBe(0);
  });

  it("rewards length", () => {
    const a = computeScore("a");
    const b = computeScore("aaaaaaaaaaaaaa");
    expect(b).toBeGreaterThan(a);
  });

  it("rewards character diversity", () => {
    const lower = computeScore("password");
    const mixed = computeScore("Passw0rd!");
    expect(mixed).toBeGreaterThan(lower);
  });

  it("penalises repetition", () => {
    const base = "Variety12!";
    const rep = "Variety12!aaaaaaaaa";
    expect(computeScore(rep)).toBeLessThan(computeScore(base));
  });

  it("penalises ascending sequences", () => {
    expect(computeScore("aaa111111!")).toBeLessThan(computeScore("Vary1!good"));
  });

  it("is capped at 100", () => {
    const long = "aB1!aB1!aB1!aB1!aB1!aB1!aB1!".repeat(4);
    expect(computeScore(long)).toBeLessThanOrEqual(100);
  });
});
