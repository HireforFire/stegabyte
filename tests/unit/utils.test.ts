import { describe, expect, it } from "vitest";
import { cn, formatBytes, formatBits, clamp, nonNull } from "@/lib/utils";

describe("cn", () => {
  it("merges classes", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(cn("px-2", "py-2")).toBe("px-2 py-2");
    const skip: string | undefined = undefined;
    expect(cn("px-2", skip, "py-2")).toBe("px-2 py-2");
  });
});

describe("formatBytes", () => {
  it("handles edge cases", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(NaN)).toBe("0 B");
  });
  it("formats B/KB/MB/GB", () => {
    expect(formatBytes(500)).toBe("500.0 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
  });
});

describe("formatBits", () => {
  it("switches to KB above 1024 bits", () => {
    expect(formatBits(0)).toBe("0 bits");
    expect(formatBits(512)).toBe("512 bits");
    expect(formatBits(2048)).toContain("KB");
  });
});

describe("clamp", () => {
  it("clamps values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(20, 0, 10)).toBe(10);
  });
});

describe("nonNull", () => {
  it("filters null and undefined", () => {
    expect(nonNull(1)).toBe(true);
    expect(nonNull(null)).toBe(false);
    expect(nonNull(undefined)).toBe(false);
  });
});
