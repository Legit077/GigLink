import { describe, expect, it } from "vitest";
import { isoToLocalInput, localInputToIso, nptDateKey, nptDaysBetween } from "./format";

describe("Nepal time helpers", () => {
  it("treats typed times as Nepal wall time (UTC+5:45)", () => {
    expect(localInputToIso("2026-11-01T18:00")).toBe("2026-11-01T12:15:00.000Z");
  });

  it("round-trips through the datetime-local format", () => {
    const iso = localInputToIso("2026-11-01T23:30");
    expect(isoToLocalInput(iso)).toBe("2026-11-01T23:30");
  });

  it("assigns the correct Nepal calendar day near midnight UTC", () => {
    // 20:00 UTC on 1 Nov is already 01:45 on 2 Nov in Nepal
    expect(nptDateKey("2026-11-01T20:00:00Z")).toBe("2026-11-02");
    expect(nptDateKey("2026-11-01T17:00:00Z")).toBe("2026-11-01");
  });
});

describe("nptDaysBetween", () => {
  it("returns a single day for a same-day event", () => {
    expect(nptDaysBetween("2026-11-01T12:00:00Z", "2026-11-01T14:00:00Z")).toEqual(["2026-11-01"]);
  });

  it("counts every Nepal day an overnight event touches", () => {
    // 18:00 NPT on 1 Nov to 02:00 NPT on 3 Nov
    expect(nptDaysBetween("2026-11-01T12:15:00Z", "2026-11-02T20:15:00Z")).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
  });
});
