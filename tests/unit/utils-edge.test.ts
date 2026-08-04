import { describe, it, expect } from "vitest";
import { formatBytes, hexToBytes } from "@/lib/utils";

describe("formatBytes boundary", () => {
  it.each([
    [0, "0 B"],
    [1, "1.0 B"],
    [1023, "1023.0 B"],
    [1024, "1.0 KB"],
    [1024 * 1024 - 1, "1024.0 KB"],
    [1024 * 1024, "1.0 MB"],
    [1024 ** 3, "1.0 GB"],
    [1024 ** 4, "1.0 TB"],
  ])("formatBytes(%i) → %s", (n, expected) => {
    expect(formatBytes(n)).toBe(expected);
  });

  it("clamps above 1024^4 (TB) gracefully", () => {
    // Above the last unit (TB), implementation clamps at TB.
    const result = formatBytes(1024 ** 5);
    expect(result).toMatch(/TB/);
  });

  it("returns '0 B' for negative input", () => {
    expect(formatBytes(-1)).toBe("0 B");
  });
});

describe("hexToBytes edge cases", () => {
  it("strips 0x prefix", () => {
    expect(Array.from(hexToBytes("0xff00"))).toEqual([0xff, 0x00]);
  });

  it("strips 0X prefix (uppercase)", () => {
    expect(Array.from(hexToBytes("0Xff00"))).toEqual([0xff, 0x00]);
  });

  it("returns empty array for empty string", () => {
    expect(Array.from(hexToBytes(""))).toEqual([]);
  });

  it("throws on invalid hex digit with index info", () => {
    expect(() => hexToBytes("abzz")).toThrow(/index 2/);
  });

  it("handles lowercase and uppercase hex", () => {
    expect(Array.from(hexToBytes("aBcDeF"))).toEqual([0xab, 0xcd, 0xef]);
  });

  it("throws on hex input exceeding the 10 MB size guard", () => {
    // 10 MB of zeros hex-encoded = 20,971,520 chars; one byte over.
    const huge = "a".repeat(10 * 1024 * 1024 * 2 + 2);
    expect(() => hexToBytes(huge)).toThrow(/too large/);
  });
});
