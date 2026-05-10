import { describe, expect, it } from "vitest";
import { calculateDurationMinutes, calculateEndTime, getWorkingDayKey, getWorkingDayKeyFromParts } from "./time";

describe("working-day reset", () => {
  it("assigns early morning time before 05:00 to the previous working day", () => {
    expect(getWorkingDayKey(new Date("2026-05-09T04:30:00"), "05:00")).toBe("2026-05-08");
  });

  it("assigns time at or after 05:00 to the current working day", () => {
    expect(getWorkingDayKey(new Date("2026-05-09T05:00:00"), "05:00")).toBe("2026-05-09");
  });

  it("assigns 02:00 on the next calendar date to the previous working day", () => {
    expect(getWorkingDayKeyFromParts("2026-05-10", "02:00")).toBe("2026-05-09");
  });
});

describe("duration calculation", () => {
  it("calculates same-day duration", () => {
    expect(calculateDurationMinutes("20:00", "21:15")).toBe(75);
  });

  it("calculates overnight duration", () => {
    expect(calculateDurationMinutes("23:30", "00:30")).toBe(60);
  });

  it("calculates end time from duration", () => {
    expect(calculateEndTime("23:30", 60)).toBe("00:30");
  });
});
