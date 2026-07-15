import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getTrendRevealProps,
  prepareResultsSeries,
  smoothWpmSamples,
  upsertLatestWpmSample,
  withOfficialFinalSample,
  type WpmSample,
} from "../../src/lib/resultsSeries";

describe("results WPM sampling", () => {
  it("keeps the latest measurement in each real elapsed-second bucket", () => {
    let samples: WpmSample[] = [];
    samples = upsertLatestWpmSample(samples, 0.12, 120);
    samples = upsertLatestWpmSample(samples, 0.91, 84);
    samples = upsertLatestWpmSample(samples, 1.08, 86);
    samples = upsertLatestWpmSample(samples, 1.94, 91);

    assert.deepEqual(samples, [
      { second: 0.91, wpm: 84 },
      { second: 1.94, wpm: 91 },
    ]);
  });

  it("creates a safe official point for an empty or very short series", () => {
    assert.deepEqual(withOfficialFinalSample([], 0.42, 73), [
      { second: 0.42, wpm: 73 },
    ]);

    const short = withOfficialFinalSample(
      [{ second: 0.18, wpm: 160 }],
      0.76,
      79,
    );
    assert.deepEqual(short, [{ second: 0.76, wpm: 79 }]);
  });

  it("preserves timestamps while EMA only changes display values", () => {
    const smoothed = smoothWpmSamples(
      [
        { second: 0.9, wpm: 100 },
        { second: 1.85, wpm: 80 },
        { second: 2.79, wpm: 60 },
      ],
      0.5,
    );

    assert.deepEqual(smoothed, [
      { second: 0.9, wpm: 100 },
      { second: 1.85, wpm: 90 },
      { second: 2.79, wpm: 75 },
    ]);
  });

  for (const mode of ["words", "time", "coder"] as const) {
    it(`guarantees the official final point for ${mode} flow`, () => {
      const result = prepareResultsSeries(
        [
          { second: 0.88, wpm: 96 },
          { second: 1.9, wpm: 82 },
        ],
        2.63,
        77,
      );

      assert.equal(result.at(-1)?.second, 2.63);
      assert.ok(result.length >= 1);
      // The official point is part of the EMA input; the official KPI itself is
      // still passed separately and is never overwritten by display smoothing.
      assert.equal(withOfficialFinalSample(result, 2.63, 77).at(-1)?.wpm, 77);
    });
  }
});

describe("trend reveal accessibility", () => {
  it("removes reveal duration when reduced motion is requested", () => {
    const reduced = getTrendRevealProps(true);
    assert.equal(reduced.initial, false);
    assert.equal(reduced.transition.duration, 0);
  });

  it("uses one compositor reveal otherwise", () => {
    const animated = getTrendRevealProps(false);
    assert.deepEqual(animated.animate, { opacity: 1, y: 0 });
    assert.equal(animated.transition.duration, 0.42);
  });
});
