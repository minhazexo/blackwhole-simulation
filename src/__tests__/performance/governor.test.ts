import { describe, test, expect } from "vitest";
import {
  governorAction,
  governorStep,
  GOVERNOR_STEP_DOWN_FPS,
  GOVERNOR_STEP_UP_FPS,
  QUALITY_LADDER,
} from "@/performance/monitor";

/**
 * Runtime quality-governor policy.
 *
 * Guarantees: never steps below "low", never above the ceiling, never
 * touches "off" (manual-only), and holds on unknown/zero FPS.
 */
describe("governorAction", () => {
  test("steps down when rolling FPS is below the floor", () => {
    expect(governorAction("ultra", "ultra", GOVERNOR_STEP_DOWN_FPS - 1)).toBe(
      "down",
    );
    expect(governorAction("high", "ultra", 5)).toBe("down");
  });

  test("holds at the bottom rung even when slow", () => {
    expect(governorAction("low", "ultra", 5)).toBe("hold");
  });

  test("steps up only toward the ceiling when healthy", () => {
    expect(governorAction("medium", "ultra", GOVERNOR_STEP_UP_FPS + 1)).toBe(
      "up",
    );
    // Already at ceiling → hold (no overshoot past user's quality).
    expect(governorAction("ultra", "ultra", 120)).toBe("hold");
    expect(governorAction("low", "low", 120)).toBe("hold");
  });

  test("holds in the middle band (no flapping)", () => {
    expect(governorAction("high", "ultra", 40)).toBe("hold");
    expect(governorAction("medium", "ultra", 60)).toBe("hold");
  });

  test("never touches manual-only 'off'", () => {
    expect(governorAction("off", "ultra", 5)).toBe("hold");
    expect(governorAction("off", "ultra", 120)).toBe("hold");
    expect(governorAction("high", "off", 120)).toBe("hold");
  });

  test("holds on unknown/zero FPS and unknown qualities", () => {
    expect(governorAction("high", "ultra", 0)).toBe("hold");
    expect(governorAction("high", "ultra", -1)).toBe("hold");
    expect(governorAction("extreme", "ultra", 5)).toBe("hold");
  });
});

describe("governorStep", () => {
  test("moves exactly one rung and clamps at the ends", () => {
    expect(governorStep("ultra", "down")).toBe("high");
    expect(governorStep("low", "up")).toBe("medium");
    expect(governorStep("low", "down")).toBe("low");
    expect(governorStep("ultra", "up")).toBe("ultra");
    expect(governorStep("medium", "hold")).toBe("medium");
  });

  test("ladder order is low → medium → high → ultra", () => {
    expect([...QUALITY_LADDER]).toEqual(["low", "medium", "high", "ultra"]);
  });
});
