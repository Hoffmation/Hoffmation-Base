import * as fs from 'fs';
import * as path from 'path';
import { getSunrise } from 'sunrise-sunset-js';
import { EnergyHistoryUtils } from '../../src/utils/energy-history-utils';
import { iActuatorStateSample } from '../../src/interfaces/iActuatorStateSample';
import { iBatteryLevelSample } from '../../src/interfaces/iBatteryLevelSample';
import { iConsumptionWindowSample } from '../../src/interfaces/iConsumptionWindowSample';
import { iEnergyHistoryFeatures } from '../../src/interfaces/iEnergyHistoryFeatures';
import { iEnergyHistoryModel } from '../../src/interfaces/iEnergyHistoryModel';
import { iEnergyHistorySample } from '../../src/interfaces/iEnergyHistorySample';
import { iFossilGeneratorRun } from '../../src/interfaces/iFossilGeneratorRun';

/**
 * Synthetic city coordinates from testdaten.md - a city, never a plant location.
 */
const CITY_LATITUDE = 52.03;
const CITY_LONGITUDE = 8.53;
const QUARTER_HOUR_MS = 15 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// Every timestamp in testdaten.md is local Europe/Berlin, all of them inside CEST. The suite runs
// with TZ=UTC (jest.config.js), so the offset is spelled out instead of relying on the machine.
function berlin(localIso: string): Date {
  return new Date(`${localIso}:00.000+02:00`);
}

// End of the morning window: the following sunrise plus a buffer hour, computed - never typed in.
function morningWindowEnd(localDay: string): number {
  return getSunrise(CITY_LATITUDE, CITY_LONGITUDE, berlin(`${localDay}T12:00`)).getTime() + HOUR_MS;
}

type SocKeyPoint = [string, number];

function levelAt(keys: Array<{ ms: number; level: number }>, ms: number): number {
  if (ms <= keys[0].ms) {
    return keys[0].level;
  }
  for (let i = 1; i < keys.length; i++) {
    if (ms <= keys[i].ms) {
      const previous = keys[i - 1];
      const next = keys[i];
      const span = next.ms - previous.ms;
      return span === 0 ? next.level : previous.level + ((ms - previous.ms) / span) * (next.level - previous.level);
    }
  }
  return keys[keys.length - 1].level;
}

// testdaten.md §1: support points, linearly interpolated, sampled on the 15 minute grid.
function socSeries(points: SocKeyPoint[]): iBatteryLevelSample[] {
  const keys = points.map(([at, level]) => ({ ms: berlin(at).getTime(), level }));
  const series: iBatteryLevelSample[] = [];
  for (let ms = keys[0].ms; ms <= keys[keys.length - 1].ms; ms += QUARTER_HOUR_MS) {
    series.push({ level: levelAt(keys, ms), date: new Date(ms) });
  }
  return series;
}

function withoutRange(series: iBatteryLevelSample[], fromLocal: string, toLocal: string): iBatteryLevelSample[] {
  const from = berlin(fromLocal).getTime();
  const to = berlin(toLocal).getTime();
  return series.filter((sample) => sample.date.getTime() < from || sample.date.getTime() > to);
}

const D_SOC_T1_POINTS: SocKeyPoint[] = [
  ['2026-06-21T00:00', 62.0],
  ['2026-06-21T04:00', 44.0],
  ['2026-06-21T06:00', 38.0],
  ['2026-06-21T09:00', 52.0],
  ['2026-06-21T12:00', 82.0],
  ['2026-06-21T13:30', 100.0],
  ['2026-06-21T17:00', 100.0],
  ['2026-06-21T19:00', 92.0],
  ['2026-06-21T21:00', 78.0],
  ['2026-06-21T23:45', 66.0],
  ['2026-06-22T00:00', 65.0],
  ['2026-06-22T03:00', 52.0],
  ['2026-06-22T05:45', 41.0],
  ['2026-06-22T06:10', 41.5],
  ['2026-06-22T08:00', 46.0],
];

const D_SOC_T1 = socSeries(D_SOC_T1_POINTS);
const D_SOC_T1_DESC = [...D_SOC_T1].reverse();
const D_SOC_T5 = D_SOC_T1.filter((sample) => sample.date.getTime() <= berlin('2026-06-21T23:45').getTime());
const D_SOC_T6A = withoutRange(D_SOC_T1, '2026-06-22T02:00', '2026-06-22T04:30');
const D_SOC_T6B = withoutRange(D_SOC_T1, '2026-06-22T05:00', '2026-06-22T06:08');
const D_SOC_T7: iBatteryLevelSample[] = [];
const D_SOC_T8: iBatteryLevelSample[] = [...D_SOC_T1, { level: 45.0, date: berlin('2026-06-22T05:45') }];

const T1_WINDOW_END = morningWindowEnd('2026-06-22');

/** testdaten.md §8: a given model, never a fit result - so gate style assertions claim no weight. */
const D_MODEL_A: iEnergyHistoryModel = {
  weights: [2.5, -0.1, -0.8, -0.3],
  intercept: 2.0,
  residualSigma: 4.0,
  sampleDays: 20,
};

function features(
  remainingSunHours: number,
  cloudCover: number,
  consumedSoFarKwh: number,
  maxTemperature: number,
): iEnergyHistoryFeatures {
  return { remainingSunHours, cloudCover, consumedSoFarKwh, maxTemperature };
}

const D_FEAT_BASE = features(11.0, 10, 6.0, 26.0);
const D_FEAT_BASE_CLOUDY = features(11.0, 80, 6.0, 26.0);
const D_FEAT_BASE_USED = features(11.0, 10, 26.0, 26.0);
const D_FEAT_BASE_HOT = features(11.0, 10, 6.0, 32.0);
const D_FEAT_BASE_DARK = features(3.0, 10, 6.0, 26.0);
const D_FEAT_B8 = features(9.0, 80, 26.0, 23.0);

/** testdaten.md §5: the twenty balanced feature rows shared by D-FIT-LIN, D-FIT-LIN2 and D-FIT-OUT. */
const FIT_FEATURE_ROWS: Array<[number, number, number, number]> = [
  [0, 10, 6, 12],
  [4, 10, 12, 18],
  [8, 10, 18, 24],
  [12, 10, 24, 30],
  [0, 40, 12, 24],
  [4, 40, 18, 30],
  [8, 40, 24, 12],
  [12, 40, 6, 18],
  [0, 70, 18, 12],
  [4, 70, 24, 18],
  [8, 70, 6, 24],
  [12, 70, 12, 30],
  [0, 100, 24, 24],
  [4, 100, 6, 30],
  [8, 100, 12, 12],
  [12, 100, 18, 18],
  [2, 25, 9, 27],
  [6, 55, 21, 15],
  [10, 85, 15, 21],
  [14, 5, 3, 9],
];

const FIT_DATES = [
  '2026-03-19',
  '2026-03-24',
  '2026-03-29',
  '2026-04-03',
  '2026-04-08',
  '2026-04-13',
  '2026-04-18',
  '2026-04-23',
  '2026-04-28',
  '2026-05-03',
  '2026-05-08',
  '2026-05-13',
  '2026-05-18',
  '2026-05-23',
  '2026-05-28',
  '2026-06-02',
  '2026-06-05',
  '2026-06-08',
  '2026-06-11',
  '2026-06-14',
];

const OUT_DATES = [
  '2025-09-01',
  '2025-09-02',
  '2025-09-03',
  '2025-09-04',
  '2025-09-05',
  '2025-09-06',
  '2025-09-07',
  '2025-09-08',
];

/**
 * The built in ground truths from testdaten.md. They live in the test on purpose - a fit has to
 * reproduce them, and they must never appear in production code (R7).
 */
const LIN_TRUTH = { intercept: -34.0, weights: [4.0, -0.25, -1.2, -0.6] };
const LIN2_TRUTH = { intercept: 12.0, weights: [-1.5, 0.4, 0.9, 1.1] };
const OUT_TRUTH = { intercept: 40.0, weights: [-3.0, 0.5, 2.0, 1.0] };

function targetOf(truth: { intercept: number; weights: number[] }, row: [number, number, number, number]): number {
  return row.reduce((sum, value, column) => sum + value * truth.weights[column], truth.intercept);
}

function fitSamples(
  truth: { intercept: number; weights: number[] },
  rows: Array<[number, number, number, number]>,
  dates: string[],
): iEnergyHistorySample[] {
  return rows.map((row, index) => ({
    features: features(row[0], row[1], row[2], row[3]),
    observedDelta: targetOf(truth, row),
    date: berlin(`${dates[index]}T18:00`),
  }));
}

const D_FIT_LIN = fitSamples(LIN_TRUTH, FIT_FEATURE_ROWS, FIT_DATES);
const D_FIT_LIN2 = fitSamples(LIN2_TRUTH, FIT_FEATURE_ROWS, FIT_DATES);
const D_FIT_OUT = fitSamples(OUT_TRUTH, FIT_FEATURE_ROWS.slice(0, 8), OUT_DATES);

const ACT_WINDOW_FROM = berlin('2026-06-27T18:00').getTime();
const ACT_WINDOW_TO = berlin('2026-06-28T05:45').getTime();

function actuator(states: Array<[string, boolean]>): iActuatorStateSample[] {
  return states.map(([at, on]) => ({ on, date: berlin(at) }));
}

function consumption(values: number[]): iConsumptionWindowSample[] {
  return values.map((consumedKwh, index) => ({
    consumedKwh,
    date: berlin(`2026-06-${String(index + 1).padStart(2, '0')}T18:00`),
  }));
}

const D_CONS_WIN_1 = consumption([12.0, 9.5, 14.5, 11.0, 18.0, 10.5, 13.0]);
const D_CONS_WIN_3 = consumption([12.0, 9.5, 14.5, 11.0, 18.0, 10.5, 13.0, 95.0]);
const D_CONS_WIN_4: iConsumptionWindowSample[] = [];
const D_CONS_WIN_5 = consumption([12.0]);
const D_CONS_WIN_6 = consumption([18.0, 14.5, 13.0, 12.0, 11.0, 10.5, 9.5]);
const MEDIAN = 0.5;
const UPPER_QUANTILE = 0.9;
// "At least one usable sum" - the N1 rule on its own. The W7 and W8 cases check the pure quantile
// arithmetic, which the minimum does not change; K18 gets its own cases below.
const NO_MINIMUM_SAMPLES = 1;

const BATTERY_CAPACITY_WH = 67000;

/**
 * One generator run, defaulting to the rating and conversion factor of the reference unit, so that a
 * case only has to name what it actually varies.
 * @param runMilliseconds - How long the generator ran inside the window.
 * @param ratedElectricalWattage - Electrical rating of the generator in watt.
 * @param conversionFactor - Share of the generated energy that reached the battery.
 * @returns The run, in the shape the correction takes.
 */
function generatorRun(
  runMilliseconds: number,
  ratedElectricalWattage = 5500,
  conversionFactor = 0.8,
): iFossilGeneratorRun {
  return { runMilliseconds, ratedElectricalWattage, conversionFactor };
}

// testdaten.md §10b: eight quarter hour readings, 18:00 to 19:45, over five days A to E.
const SLOT_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const READING_INTERVAL_MS = SLOT_MS;
const SLOT_WINDOW_FROM = berlin('2026-06-21T18:00').getTime();
const SLOT_WINDOW_UNTIL = berlin('2026-06-21T20:00').getTime();
/** A day must carry every reading of the window; anything less makes its sum too small. */
const FULL_COVERAGE = 1;

// D-SLOT-1: the deviations rotate per slot, so every slot median is the base value and no day is the
// expensive one throughout. Day sums 3.14 / 3.20 / 3.26 / 3.22 / 3.18.
const D_SLOT_1_ROWS: number[][] = [
  [0.3, 0.38, 0.46, 0.64, 0.52, 0.4, 0.28, 0.16],
  [0.32, 0.4, 0.48, 0.56, 0.54, 0.42, 0.3, 0.18],
  [0.34, 0.42, 0.5, 0.58, 0.46, 0.44, 0.32, 0.2],
  [0.26, 0.44, 0.52, 0.6, 0.48, 0.36, 0.34, 0.22],
  [0.28, 0.36, 0.54, 0.62, 0.5, 0.38, 0.26, 0.24],
];

// Turns the table above into the flat reading list the persistence would hand over. testdaten.md
// labels the slots by their START (18:00 .. 19:45), while a persisted reading is dated at the END of
// the interval it closes - so the slot labelled 18:00 arrives dated 18:15 and the last one 20:00. The
// values are untouched; only the timestamps sit where the convention puts them.
function slotReadings(rows: number[][], skipSlots: (day: number, slot: number) => boolean = () => false) {
  const readings: iConsumptionWindowSample[] = [];
  rows.forEach((row, day) => {
    row.forEach((consumedKwh, slot) => {
      if (skipSlots(day, slot)) {
        return;
      }
      readings.push({ consumedKwh, date: new Date(SLOT_WINDOW_FROM + day * DAY_MS + (slot + 1) * SLOT_MS) });
    });
  });
  return readings;
}

const D_SLOT_1 = slotReadings(D_SLOT_1_ROWS);
// 18:45 is slot index 3 - missing on every day, so no day covers the window.
const D_SLOT_HOLE = slotReadings(D_SLOT_1_ROWS, (_day, slot) => slot === 3);
// The same gap on day A only: that day alone must drop out.
const D_SLOT_HOLE_ONE_DAY = slotReadings(D_SLOT_1_ROWS, (day, slot) => day === 0 && slot === 3);
const D_SLOT_UNSORTED = [...D_SLOT_1].reverse();

// D-SLOT-WRAP: 22:00 to 02:00, sixteen readings straddling midnight. Each day repeats its D-SLOT-1
// row twice, so no magnitude is invented and every day sum is exactly twice its D-SLOT-1 sum.
const WRAP_FROM = berlin('2026-06-21T22:00').getTime();
const WRAP_UNTIL = berlin('2026-06-22T02:00').getTime();
const D_SLOT_WRAP: iConsumptionWindowSample[] = [];
D_SLOT_1_ROWS.forEach((row, day) => {
  [...row, ...row].forEach((consumedKwh, slot) => {
    D_SLOT_WRAP.push({ consumedKwh, date: new Date(WRAP_FROM + day * DAY_MS + (slot + 1) * SLOT_MS) });
  });
});

// The wrong way, computed here so the test can show what it would have cost.
function summedReadingQuantiles(rows: number[][], quantile: number): number {
  let total = 0;
  for (let slot = 0; slot < rows[0].length; slot++) {
    const sorted = rows.map((row) => row[slot]).sort((a, b) => a - b);
    const position = quantile * (sorted.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    total += lower === upper ? sorted[lower] : sorted[lower] + (position - lower) * (sorted[upper] - sorted[lower]);
  }
  return total;
}

describe('EnergyHistoryUtils', () => {
  describe('R3 - change up to the next morning low', () => {
    it('R3.1b takes the low of the whole window, not only of the following morning', () => {
      // Verhaltensvertrag 4 defines the low as the minimum between the moment of evaluation and the
      // following sunrise plus a buffer hour. Evaluated at 06:00 the series is still climbing, so
      // the lowest point ahead is 06:15 at 39.17 - not the next morning's 41.0. testdaten.md §1
      // tabulates +3.0 for this row, which reads the next morning in isolation; every other row of
      // that table agrees with the window minimum. Reported as a divergence - the window minimum is
      // what the decision needs, because the battery has to survive every moment until then.
      const delta = EnergyHistoryUtils.deltaToNextMorningLow(
        D_SOC_T1,
        berlin('2026-06-21T06:00').getTime(),
        T1_WINDOW_END,
      );
      expect(delta).toBeCloseTo(1.17, 1);
      expect(delta).toBeGreaterThan(0);
    });

    it('R3.2 yields different values for two moments of the same day', () => {
      const morning = EnergyHistoryUtils.deltaToNextMorningLow(
        D_SOC_T1,
        berlin('2026-06-21T09:00').getTime(),
        T1_WINDOW_END,
      );
      const noon = EnergyHistoryUtils.deltaToNextMorningLow(
        D_SOC_T1,
        berlin('2026-06-21T13:30').getTime(),
        T1_WINDOW_END,
      );
      expect(morning).toBeCloseTo(-11.0, 1);
      expect(noon).toBeCloseTo(-59.0, 1);
      expect(morning).not.toBeCloseTo(noon as number, 1);
    });

    it('R3.4 returns undefined when no following morning is in the data', () => {
      expect(
        EnergyHistoryUtils.deltaToNextMorningLow(D_SOC_T5, berlin('2026-06-21T18:00').getTime(), T1_WINDOW_END),
      ).toBeUndefined();
    });

    it('R3.5 does not depend on the order the samples arrive in', () => {
      const ascending = EnergyHistoryUtils.deltaToNextMorningLow(
        D_SOC_T1,
        berlin('2026-06-21T09:00').getTime(),
        T1_WINDOW_END,
      );
      const descending = EnergyHistoryUtils.deltaToNextMorningLow(
        D_SOC_T1_DESC,
        berlin('2026-06-21T09:00').getTime(),
        T1_WINDOW_END,
      );
      expect(descending).toBe(ascending);
    });

    it('R3.6 tolerates a harmless gap in the series', () => {
      const delta = EnergyHistoryUtils.deltaToNextMorningLow(
        D_SOC_T6A,
        berlin('2026-06-21T18:00').getTime(),
        T1_WINDOW_END,
      );
      expect(delta).toBeCloseTo(-55.0, 1);
    });

    it('R3.6b takes the lowest surviving point when the gap swallows the true low', () => {
      const delta = EnergyHistoryUtils.deltaToNextMorningLow(
        D_SOC_T6B,
        berlin('2026-06-21T18:00').getTime(),
        T1_WINDOW_END,
      );
      expect(delta).toBeCloseTo(-51.0, 1);
      expect(Number.isNaN(delta as number)).toBe(false);
    });

    it('R3.7 returns undefined for an empty sample list', () => {
      expect(
        EnergyHistoryUtils.deltaToNextMorningLow(D_SOC_T7, berlin('2026-06-21T18:00').getTime(), T1_WINDOW_END),
      ).toBeUndefined();
    });

    it('R3.8 honours the window it was handed', () => {
      const regular = EnergyHistoryUtils.deltaToNextMorningLow(
        D_SOC_T1,
        berlin('2026-06-21T18:00').getTime(),
        T1_WINDOW_END,
      );
      const shortened = EnergyHistoryUtils.deltaToNextMorningLow(
        D_SOC_T1,
        berlin('2026-06-21T18:00').getTime(),
        berlin('2026-06-22T03:00').getTime(),
      );
      expect(regular).toBeCloseTo(-55.0, 1);
      expect(shortened).toBeCloseTo(-44.0, 1);
    });

    it('D-SOC-T8 survives two readings on the same timestamp and keeps the lower one', () => {
      const delta = EnergyHistoryUtils.deltaToNextMorningLow(
        D_SOC_T8,
        berlin('2026-06-21T18:00').getTime(),
        T1_WINDOW_END,
      );
      expect(delta).toBeCloseTo(-55.0, 1);
    });
  });

  describe('R4 - removing the fossil generation share', () => {
    it('R4.1 removes 9.85 points for the reference run', () => {
      expect(
        EnergyHistoryUtils.correctForFossilGeneration(-22.0, [generatorRun(5400000)], BATTERY_CAPACITY_WH),
      ).toBeCloseTo(-31.85, 1);
    });

    it('R4.2 returns the input unchanged for a zero runtime', () => {
      expect(EnergyHistoryUtils.correctForFossilGeneration(-22.0, [generatorRun(0)], BATTERY_CAPACITY_WH)).toBe(-22.0);
    });

    it('R4.3 never raises the observed change', () => {
      // The reference run and the zero runtime are R4.1 and R4.2; what only this case carries is a
      // positive observation turning negative and the longest runtime of the block.
      const cases: Array<[number, number, number]> = [
        [3.0, 5400000, -6.85],
        [-22.0, 31500000, -79.46],
      ];
      for (const [observed, runtime, expected] of cases) {
        const corrected = EnergyHistoryUtils.correctForFossilGeneration(
          observed,
          [generatorRun(runtime)],
          BATTERY_CAPACITY_WH,
        );
        expect(corrected).toBeCloseTo(expected, 1);
        expect(corrected).toBeLessThanOrEqual(observed);
      }
    });

    it('R4.4 does not produce NaN or Infinity for a zero capacity', () => {
      const corrected = EnergyHistoryUtils.correctForFossilGeneration(-22.0, [generatorRun(5400000)], 0);
      expect(Number.isFinite(corrected)).toBe(true);
      expect(corrected).toBe(-22.0);
    });

    it('R4.5 ignores a negative runtime', () => {
      expect(EnergyHistoryUtils.correctForFossilGeneration(-22.0, [generatorRun(-5400000)], BATTERY_CAPACITY_WH)).toBe(
        -22.0,
      );
    });

    it('R4.10 leaves the observation untouched for an empty list', () => {
      expect(EnergyHistoryUtils.correctForFossilGeneration(-22.0, [], BATTERY_CAPACITY_WH)).toBe(-22.0);
    });

    it('R4.11 adds the shares of two generators', () => {
      // Splitting one run across two entries has to land on the single entry result of R4.1, which is
      // what makes "additive" a property rather than a wording.
      const split = EnergyHistoryUtils.correctForFossilGeneration(
        -22.0,
        [generatorRun(1800000), generatorRun(3600000)],
        BATTERY_CAPACITY_WH,
      );
      expect(split).toBeCloseTo(-31.85, 1);

      // Different ratings and conversion factors carry per entry rather than off the first one.
      const mixed = EnergyHistoryUtils.correctForFossilGeneration(
        -22.0,
        [generatorRun(5400000), generatorRun(5400000, 3000, 0.5)],
        BATTERY_CAPACITY_WH,
      );
      expect(mixed).toBeCloseTo(-35.21, 1);
    });

    it('R4.12 drops an unusable entry and keeps the usable ones', () => {
      const corrected = EnergyHistoryUtils.correctForFossilGeneration(
        -22.0,
        [generatorRun(Number.NaN), generatorRun(5400000)],
        BATTERY_CAPACITY_WH,
      );
      expect(corrected).toBeCloseTo(-31.85, 1);
    });

    it('R4.6 sums the on time of a plain run', () => {
      const samples = actuator([
        ['2026-06-27T19:00', true],
        ['2026-06-27T20:30', false],
      ]);
      expect(EnergyHistoryUtils.onMillisecondsWithin(samples, ACT_WINDOW_FROM, ACT_WINDOW_TO)).toBe(5400000);
    });

    it('R4.8 counts only the part of a run that lies inside the window', () => {
      const samples = actuator([
        ['2026-06-27T17:30', true],
        ['2026-06-27T19:00', false],
      ]);
      expect(EnergyHistoryUtils.onMillisecondsWithin(samples, ACT_WINDOW_FROM, ACT_WINDOW_TO)).toBe(3600000);
    });

    it('R4.9 counts an unfinished run up to the end of the window', () => {
      const samples = actuator([['2026-06-27T21:00', true]]);
      expect(EnergyHistoryUtils.onMillisecondsWithin(samples, ACT_WINDOW_FROM, ACT_WINDOW_TO)).toBe(31500000);
    });

    it('R4.10 returns zero for an empty sequence', () => {
      expect(EnergyHistoryUtils.onMillisecondsWithin([], ACT_WINDOW_FROM, ACT_WINDOW_TO)).toBe(0);
    });

    it('R4.11 does not count a repeated on twice', () => {
      const samples = actuator([
        ['2026-06-27T19:00', true],
        ['2026-06-27T19:20', true],
        ['2026-06-27T20:30', false],
      ]);
      expect(EnergyHistoryUtils.onMillisecondsWithin(samples, ACT_WINDOW_FROM, ACT_WINDOW_TO)).toBe(5400000);
    });

    it('R4.11b does not depend on the order the state changes arrive in', () => {
      const samples = actuator([
        ['2026-06-27T20:30', false],
        ['2026-06-27T19:00', true],
      ]);
      expect(EnergyHistoryUtils.onMillisecondsWithin(samples, ACT_WINDOW_FROM, ACT_WINDOW_TO)).toBe(5400000);
    });

    it('R4.12 treats an unknown state before the window as on', () => {
      const samples = actuator([['2026-06-27T18:40', false]]);
      expect(EnergyHistoryUtils.onMillisecondsWithin(samples, ACT_WINDOW_FROM, ACT_WINDOW_TO)).toBe(2400000);
    });

    it('D-ACT-9 ignores a run that lies completely before the window', () => {
      const samples = actuator([
        ['2026-06-27T12:00', true],
        ['2026-06-27T14:00', false],
      ]);
      expect(EnergyHistoryUtils.onMillisecondsWithin(samples, ACT_WINDOW_FROM, ACT_WINDOW_TO)).toBe(0);
    });
  });

  describe('R5 - the point estimate from four quantities', () => {
    it('R5.1 more cloud cover lowers the estimate', () => {
      const clear = EnergyHistoryUtils.estimate(D_MODEL_A, D_FEAT_BASE, 1.0);
      const cloudy = EnergyHistoryUtils.estimate(D_MODEL_A, D_FEAT_BASE_CLOUDY, 1.0);
      expect(clear.expectedDelta).toBeCloseTo(15.9, 5);
      expect(cloudy.expectedDelta).toBeCloseTo(8.9, 5);
      expect(cloudy.expectedDelta).toBeLessThan(clear.expectedDelta);
    });

    it('R5.2 more consumption so far lowers the estimate', () => {
      expect(EnergyHistoryUtils.estimate(D_MODEL_A, D_FEAT_BASE_USED, 1.0).expectedDelta).toBeCloseTo(-0.1, 5);
    });

    it('R5.3 a higher maximum temperature lowers the estimate', () => {
      expect(EnergyHistoryUtils.estimate(D_MODEL_A, D_FEAT_BASE_HOT, 1.0).expectedDelta).toBeCloseTo(14.1, 5);
    });

    it('R5.4 more remaining sun hours raises the estimate', () => {
      const dark = EnergyHistoryUtils.estimate(D_MODEL_A, D_FEAT_BASE_DARK, 1.0);
      const bright = EnergyHistoryUtils.estimate(D_MODEL_A, D_FEAT_BASE, 1.0);
      expect(dark.expectedDelta).toBeCloseTo(-4.1, 5);
      expect(bright.expectedDelta).toBeGreaterThan(dark.expectedDelta);
    });

    it('R5.5 takes exactly four quantities', () => {
      expect(Object.keys(D_FEAT_BASE)).toHaveLength(4);
      expect(D_MODEL_A.weights).toHaveLength(4);
      // A fifth weight must not compile - "more quantities are excluded" stays checkable.
      // @ts-expect-error a fifth weight breaks the model tuple
      const fiveWeights: iEnergyHistoryModel['weights'] = [1, 2, 3, 4, 5];
      expect(fiveWeights).toHaveLength(5);
    });
  });

  describe('R7 - the weights come out of the fit', () => {
    it('the generated data set reproduces the tabulated targets of testdaten.md', () => {
      expect(D_FIT_LIN[0].observedDelta).toBeCloseTo(-50.9, 5);
      expect(D_FIT_LIN[19].observedDelta).toBeCloseTo(11.75, 5);
      expect(D_FIT_LIN2[0].observedDelta).toBeCloseTo(34.6, 5);
      expect(D_FIT_LIN2[19].observedDelta).toBeCloseTo(5.6, 5);
      expect(D_FIT_OUT[0].observedDelta).toBeCloseTo(69.0, 5);
      expect(D_FIT_OUT[7].observedDelta).toBeCloseTo(54.0, 5);
    });

    it('R7.1 reproduces the built-in weights of a strictly linear data set', () => {
      const model = EnergyHistoryUtils.fit(D_FIT_LIN, 15);
      expect(model).toBeDefined();
      expectWithinFivePercent(model as iEnergyHistoryModel, LIN_TRUTH);
    });

    it('R7.2 reports a residual sigma of zero for a noiseless data set', () => {
      const model = EnergyHistoryUtils.fit(D_FIT_LIN, 15) as iEnergyHistoryModel;
      expect(model.residualSigma).toBeLessThan(1e-6);
      expect(model.sampleDays).toBe(20);
    });

    it('R7.3 recovers a second, different set of weights from the same shaped data', () => {
      const model = EnergyHistoryUtils.fit(D_FIT_LIN2, 15);
      expect(model).toBeDefined();
      expectWithinFivePercent(model as iEnergyHistoryModel, LIN2_TRUTH);
    });

    it('R7.4 no weight appears as a literal in the production code of this lane', () => {
      const source = fs.readFileSync(path.join(__dirname, '../../src/utils/energy-history-utils.ts'), 'utf-8');
      // Every ground truth of testdaten.md is a decimal, and this file needs no decimal of its own:
      // its constants are counts and unit conversions. So the absence of any decimal literal is the
      // observable form of "no weight is written by hand" - stronger than a list of forbidden values,
      // which integers such as 4.0 or -34.0 would slip past.
      expect(source).not.toMatch(/(?<![\w.])\d+\.\d+/);
      for (const value of [...LIN_TRUTH.weights, ...LIN2_TRUTH.weights, ...D_MODEL_A.weights]) {
        expect(source).not.toContain(Math.abs(value).toFixed(2));
      }
    });

    it('R7.5 returns undefined below the minimum number of days', () => {
      expect(EnergyHistoryUtils.fit(D_FIT_LIN.slice(0, 14), 15)).toBeUndefined();
    });

    it('R7.6 fits with exactly the minimum number of days', () => {
      const model = EnergyHistoryUtils.fit(D_FIT_LIN.slice(0, 15), 15);
      expect(model).toBeDefined();
      expect((model as iEnergyHistoryModel).sampleDays).toBe(15);
      expectWithinFivePercent(model as iEnergyHistoryModel, LIN_TRUTH);
    });
  });

  describe('R21.1 - the fit uses only what it was handed', () => {
    it('fits only from the samples it was handed', () => {
      const clean = EnergyHistoryUtils.fit(D_FIT_LIN, 15) as iEnergyHistoryModel;
      const polluted = EnergyHistoryUtils.fit([...D_FIT_LIN, ...D_FIT_OUT], 15) as iEnergyHistoryModel;
      expect(clean).toBeDefined();
      expect(polluted).toBeDefined();
      const worstDeviation = Math.max(
        ...polluted.weights.map((weight, index) =>
          Math.abs((weight - LIN_TRUTH.weights[index]) / LIN_TRUTH.weights[index]),
        ),
      );
      expect(worstDeviation).toBeGreaterThan(0.2);
      expect(polluted.residualSigma).toBeGreaterThan(1.0);
      expect(polluted.sampleDays).toBe(28);
    });
  });

  describe('R8 - the band around the point estimate', () => {
    it('R8.1 places the edges one sigma around the point estimate', () => {
      const band = EnergyHistoryUtils.estimate(D_MODEL_A, D_FEAT_B8, 1.0);
      expect(band.expectedDelta).toBeCloseTo(-11.2, 2);
      expect(band.lowerEdgeDelta).toBeCloseTo(-15.2, 2);
      expect(band.upperEdgeDelta).toBeCloseTo(-7.2, 2);
      expect(band.sampleDays).toBe(20);
    });

    it('R8.2 collapses the band at bandSigma zero', () => {
      const band = EnergyHistoryUtils.estimate(D_MODEL_A, D_FEAT_B8, 0);
      expect(band.lowerEdgeDelta).toBe(band.expectedDelta);
      expect(band.upperEdgeDelta).toBe(band.expectedDelta);
    });
  });

  describe('W - the model free bound', () => {
    it('W1 subtracts the consumption in state of charge points', () => {
      // 12 kWh out of 67 kWh is 17.91 points, whatever the starting level: from the full battery and
      // from the lowest one that still stays above zero. The levels in between are W6's.
      expect(EnergyHistoryUtils.worstCaseLowSoc(100.0, 12.0, BATTERY_CAPACITY_WH)).toBeCloseTo(82.09, 2);
      expect(EnergyHistoryUtils.worstCaseLowSoc(22.0, 12.0, BATTERY_CAPACITY_WH)).toBeCloseTo(4.09, 2);
    });

    it('W4 returns zero for an unusable capacity', () => {
      const bound = EnergyHistoryUtils.worstCaseLowSoc(35.0, 12.0, 0);
      expect(bound).toBe(0);
      expect(Number.isFinite(bound)).toBe(true);
    });

    it('W5 ignores a negative consumption', () => {
      expect(EnergyHistoryUtils.worstCaseLowSoc(35.0, -12.0, BATTERY_CAPACITY_WH)).toBe(35.0);
    });

    it('W6 is monotone in the consumption', () => {
      const bounds = [0, 6.0, 12.0, 30.0, 60.0].map((consumed) =>
        EnergyHistoryUtils.worstCaseLowSoc(78.0, consumed, BATTERY_CAPACITY_WH),
      );
      // The two ends of the row are the edge cases: nothing consumed leaves the level untouched, and
      // more than the battery holds stops at zero rather than going negative.
      expect(bounds[0]).toBe(78.0);
      expect(bounds[1]).toBeCloseTo(69.04, 1);
      expect(bounds[2]).toBeCloseTo(60.09, 2);
      expect(bounds[3]).toBeCloseTo(33.22, 1);
      expect(bounds[4]).toBe(0);
      for (let i = 1; i < bounds.length; i++) {
        expect(bounds[i]).toBeLessThanOrEqual(bounds[i - 1]);
      }
    });

    it('W7 is robust against an outlier where the mean is not', () => {
      const quantile = EnergyHistoryUtils.consumptionQuantileKwh(D_CONS_WIN_3, MEDIAN, NO_MINIMUM_SAMPLES) as number;
      const mean = D_CONS_WIN_3.reduce((sum, sample) => sum + sample.consumedKwh, 0) / D_CONS_WIN_3.length;
      expect(quantile).toBeCloseTo(12.5, 5);
      expect(mean).toBeCloseTo(22.9, 1);
    });

    it('W8 handles the sample list edge cases', () => {
      expect(EnergyHistoryUtils.consumptionQuantileKwh(D_CONS_WIN_1, MEDIAN, NO_MINIMUM_SAMPLES)).toBeCloseTo(12.0, 5);
      // A single night is its own quantile, whichever quantile is asked for - K18b relies on that.
      expect(EnergyHistoryUtils.consumptionQuantileKwh(D_CONS_WIN_5, MEDIAN, NO_MINIMUM_SAMPLES)).toBeCloseTo(12.0, 5);
      expect(EnergyHistoryUtils.consumptionQuantileKwh(D_CONS_WIN_6, MEDIAN, NO_MINIMUM_SAMPLES)).toBeCloseTo(12.0, 5);
    });

    it('W8b returns undefined for an empty sample, never a zero', () => {
      const empty = EnergyHistoryUtils.consumptionQuantileKwh(D_CONS_WIN_4, MEDIAN, NO_MINIMUM_SAMPLES);
      expect(empty).toBeUndefined();
      expect(empty).not.toBe(0);
    });

    it('W9 sums each day over the same window - D-SLOT-1', () => {
      const sums = EnergyHistoryUtils.windowConsumptionSums(
        D_SLOT_1,
        SLOT_WINDOW_FROM,
        SLOT_WINDOW_UNTIL,
        READING_INTERVAL_MS,
        FULL_COVERAGE,
      );
      expect(sums.map((sample) => Number(sample.consumedKwh.toFixed(2)))).toEqual([3.14, 3.2, 3.26, 3.22, 3.18]);
      expect(EnergyHistoryUtils.consumptionQuantileKwh(sums, MEDIAN, NO_MINIMUM_SAMPLES)).toBeCloseTo(3.2, 5);
    });

    it('W10 reads the quantile of the sums, never the sum of the quantiles - D-SLOT-1', () => {
      const sums = EnergyHistoryUtils.windowConsumptionSums(
        D_SLOT_1,
        SLOT_WINDOW_FROM,
        SLOT_WINDOW_UNTIL,
        READING_INTERVAL_MS,
        FULL_COVERAGE,
      );
      const quantileOfSums = EnergyHistoryUtils.consumptionQuantileKwh(
        sums,
        UPPER_QUANTILE,
        NO_MINIMUM_SAMPLES,
      ) as number;
      const sumOfQuantiles = summedReadingQuantiles(D_SLOT_1_ROWS, UPPER_QUANTILE);
      expect(quantileOfSums).toBeCloseTo(3.244, 3);
      // The wrong way applies the margin once per reading instead of once per window: 0.212 kWh or
      // 6.6 % too high. D-SLOT-1 is the data set where the two ways come apart at all - on a day
      // regime they coincide by chance, so a test against such a set alone would be empty.
      expect(sumOfQuantiles).toBeCloseTo(3.456, 3);
      expect(sumOfQuantiles - quantileOfSums).toBeCloseTo(0.212, 3);
      expect(quantileOfSums).toBeLessThan(sumOfQuantiles);
    });

    it('W12 drops a day that does not cover the window instead of letting it lower the bound', () => {
      const withOneHole = EnergyHistoryUtils.windowConsumptionSums(
        D_SLOT_HOLE_ONE_DAY,
        SLOT_WINDOW_FROM,
        SLOT_WINDOW_UNTIL,
        READING_INTERVAL_MS,
        FULL_COVERAGE,
      );
      // Day A is missing 18:45 (0.64 kWh), so its sum would be 2.50 - a night that looks frugal
      // without having been one. It must not appear at all.
      expect(withOneHole).toHaveLength(4);
      expect(withOneHole.every((sample) => sample.consumedKwh > 3)).toBe(true);

      const holeMedian = EnergyHistoryUtils.consumptionQuantileKwh(withOneHole, MEDIAN, NO_MINIMUM_SAMPLES) as number;
      // What it would have cost: counting the short day pulls the median below the one the four
      // covered days give - a lower consumption means a higher bound and therefore a suppression the
      // house did not earn.
      const naiveMedian = EnergyHistoryUtils.consumptionQuantileKwh(
        [...withOneHole, { consumedKwh: 2.5, date: new Date(SLOT_WINDOW_FROM) }],
        MEDIAN,
        NO_MINIMUM_SAMPLES,
      ) as number;
      expect(naiveMedian).toBeLessThan(holeMedian);
    });

    it('W12b yields no bound at all when the gap hits every day - D-SLOT-HOLE', () => {
      const sums = EnergyHistoryUtils.windowConsumptionSums(
        D_SLOT_HOLE,
        SLOT_WINDOW_FROM,
        SLOT_WINDOW_UNTIL,
        READING_INTERVAL_MS,
        FULL_COVERAGE,
      );
      expect(sums).toEqual([]);
      // No substitute value and no silent skipping: without a covered day there is no bound.
      expect(EnergyHistoryUtils.consumptionQuantileKwh(sums, UPPER_QUANTILE, NO_MINIMUM_SAMPLES)).toBeUndefined();
    });

    it('W12c handles the remaining slot edge cases - EMPTY, UNSORTED, WRAP', () => {
      // D-SLOT-EMPTY: no readings at all is its own route to "no covered day" - W12b takes the other
      // one, where readings exist but none of the days is complete.
      expect(
        EnergyHistoryUtils.windowConsumptionSums([], SLOT_WINDOW_FROM, SLOT_WINDOW_UNTIL, READING_INTERVAL_MS, 0),
      ).toEqual([]);

      // D-SLOT-UNSORTED: the stock read pattern sorts DESC, and that must not matter.
      const unsorted = EnergyHistoryUtils.windowConsumptionSums(
        D_SLOT_UNSORTED,
        SLOT_WINDOW_FROM,
        SLOT_WINDOW_UNTIL,
        READING_INTERVAL_MS,
        FULL_COVERAGE,
      );
      const sorted = EnergyHistoryUtils.windowConsumptionSums(
        D_SLOT_1,
        SLOT_WINDOW_FROM,
        SLOT_WINDOW_UNTIL,
        READING_INTERVAL_MS,
        FULL_COVERAGE,
      );
      expect(unsorted.map((s) => s.consumedKwh.toFixed(4))).toEqual(sorted.map((s) => s.consumedKwh.toFixed(4)));

      // D-SLOT-WRAP: 22:00 to 02:00. Grouping by calendar day would cut every night in half and
      // leave each half under covered - the whole window would disappear.
      const wrap = EnergyHistoryUtils.windowConsumptionSums(
        D_SLOT_WRAP,
        WRAP_FROM,
        WRAP_UNTIL,
        READING_INTERVAL_MS,
        FULL_COVERAGE,
      );
      expect(wrap).toHaveLength(5);
      expect(wrap[0].consumedKwh).toBeCloseTo(2 * 3.14, 5);
      expect(EnergyHistoryUtils.consumptionQuantileKwh(wrap, MEDIAN, NO_MINIMUM_SAMPLES)).toBeCloseTo(2 * 3.2, 5);
    });

    it('K18b answers again at exactly the minimum, and the pair pins the boundary', () => {
      const four = D_CONS_WIN_1.slice(0, 4);
      const five = D_CONS_WIN_1.slice(0, 5);
      // Below the minimum there is no bound at all, the way fit refuses one - and undefined, never a
      // zero, which would read as "nothing expected" and suppress (N1).
      expect(EnergyHistoryUtils.consumptionQuantileKwh(four, UPPER_QUANTILE, 5)).toBeUndefined();
      expect(EnergyHistoryUtils.consumptionQuantileKwh(four, UPPER_QUANTILE, 5)).not.toBe(0);
      expect(EnergyHistoryUtils.consumptionQuantileKwh(five, UPPER_QUANTILE, 5)).toBeDefined();
      // Only the pair fixes where the line runs; one test alone leaves it anywhere.
      expect(EnergyHistoryUtils.consumptionQuantileKwh(five, MEDIAN, 5)).toBeCloseTo(12.0, 5);
    });

    it('K18c counts usable sums, not handed-in ones', () => {
      const withRubbish: iConsumptionWindowSample[] = [
        ...D_CONS_WIN_1.slice(0, 3),
        { consumedKwh: Number.NaN, date: new Date(SLOT_WINDOW_FROM) },
        { consumedKwh: Number.POSITIVE_INFINITY, date: new Date(SLOT_WINDOW_FROM) },
      ];
      // Five entries, three usable - the minimum has to bite on the three, otherwise two unusable
      // readings would buy a bound that no measurement supports.
      expect(EnergyHistoryUtils.consumptionQuantileKwh(withRubbish, UPPER_QUANTILE, 5)).toBeUndefined();
      expect(EnergyHistoryUtils.consumptionQuantileKwh(withRubbish, UPPER_QUANTILE, 3)).toBeDefined();
    });

    it('K20 treats the window as half open, (from, until]', () => {
      // Readings are dated at the END of the interval they close (iPersist.getEnergyConsumptionHistory:
      // "so readings can be added up over a window without counting an interval into the wrong one").
      // So the reading dated exactly at fromMs closes the interval BEFORE the window and belongs to the
      // previous one, while the reading dated exactly at untilMs closes the window's last interval and
      // belongs to this one. Under [from, until) both would land on the wrong side, and the sum would
      // silently describe [from - 15 min, until - 15 min] with an unchanged reading count.
      const onLowerEdge: iConsumptionWindowSample[] = [{ consumedKwh: 0.3, date: new Date(SLOT_WINDOW_FROM) }];
      const onUpperEdge: iConsumptionWindowSample[] = [{ consumedKwh: 0.2, date: new Date(SLOT_WINDOW_UNTIL) }];

      // Both edges together: exactly one of them counts, and it is the upper one. This is the
      // assertion that falls under the opposite convention - there the sum would read 0.30.
      const both = EnergyHistoryUtils.windowConsumptionSums(
        [...onLowerEdge, ...onUpperEdge],
        SLOT_WINDOW_FROM,
        SLOT_WINDOW_UNTIL,
        SLOT_MS,
        0,
      );
      expect(both).toHaveLength(1);
      expect(both[0].consumedKwh).toBeCloseTo(0.2, 5);
    });

    it('K15 sums a window that is longer than a calendar day instead of refusing it', () => {
      // The caller asks "from now until the next morning low". Once now has passed today's sunrise
      // that end is tomorrow's, so the window runs past 24 hours - every day, for about an hour.
      const longFrom = berlin('2026-06-21T06:00').getTime();
      const longUntil = berlin('2026-06-22T07:00').getTime();
      expect(longUntil - longFrom).toBeGreaterThan(24 * 60 * 60 * 1000);

      // One continuous quarter hour stream, the way a logger really records - not one block per day,
      // which would put duplicate readings into the stretch where two occurrences overlap.
      const readings: iConsumptionWindowSample[] = [];
      const stepCount = (longUntil - longFrom) / SLOT_MS;
      // Dated at interval ends, so the stream starts one interval after the oldest window opens and
      // includes the closing reading of the newest.
      for (let ms = longFrom - 4 * DAY_MS + SLOT_MS; ms <= longUntil; ms += SLOT_MS) {
        readings.push({ consumedKwh: 0.25, date: new Date(ms) });
      }
      const sums = EnergyHistoryUtils.windowConsumptionSums(readings, longFrom, longUntil, READING_INTERVAL_MS, 1);
      // Four whole past occurrences plus the current one, which is complete here because the readings
      // were generated for it too. Nothing is refused and nothing is truncated.
      expect(sums).toHaveLength(5);
      for (const sample of sums) {
        expect(sample.consumedKwh).toBeCloseTo(stepCount * 0.25, 5);
      }
    });

    it('K15b counts a reading shared by two overlapping occurrences towards both', () => {
      const longFrom = berlin('2026-06-21T06:00').getTime();
      const longUntil = berlin('2026-06-22T07:00').getTime();
      // A single reading in the stretch where yesterday's window and today's window overlap: it lies
      // after today's start and still before yesterday's end.
      const shared = berlin('2026-06-21T06:30').getTime();
      expect(shared).toBeGreaterThan(longFrom);
      expect(shared).toBeLessThan(longUntil - DAY_MS);

      const sums = EnergyHistoryUtils.windowConsumptionSums(
        [{ consumedKwh: 1.0, date: new Date(shared) }],
        longFrom,
        longUntil,
        READING_INTERVAL_MS,
        // No coverage demand, so the two thin occurrences both survive and stay visible.
        0,
      );
      // Both occurrences really did contain that quarter hour, so both sums carry it. Choosing one
      // would make the other understate its own window - and understating consumption raises the
      // bound, which is the suppressing direction.
      expect(sums).toHaveLength(2);
      expect(sums.map((sample) => sample.consumedKwh)).toEqual([1.0, 1.0]);
      expect(sums[1].date.getTime() - sums[0].date.getTime()).toBe(DAY_MS);
    });
  });

  describe('K6 - the day buckets are calendar days, not fixed millisecond steps', () => {
    // In UTC no clock ever changes, so calendar day steps and 86400000 ms steps are the same thing and
    // nothing here can discriminate. The zone cannot be switched from inside the file either: jest
    // hands each file a sandboxed `process`, so `process.env.TZ = 'Europe/Berlin'` reads back as Berlin
    // while V8 keeps resolving UTC - measured, not assumed (a probe returned 12:00 for both a July and
    // a December instant). Rather than pass vacuously, the case declares itself skipped until the
    // runner supplies a zone with a daylight saving change. See the report: this needs TZ on the jest
    // side, which is not this lane's file.
    const zoneHasDaylightSaving =
      new Date('2026-07-01T12:00:00Z').getTimezoneOffset() !== new Date('2026-12-01T12:00:00Z').getTimezoneOffset();
    const itInADaylightSavingZone = zoneHasDaylightSaving ? it : it.skip;

    // Europe/Berlin turns the clock back in the night of 2026-10-24 to 2026-10-25 (03:00 becomes
    // 02:00). Five night windows 22:00 to 06:00 straddle it: two before the change, three after.
    const NIGHT_STARTS = [
      '2026-10-23T22:00:00',
      '2026-10-24T22:00:00',
      '2026-10-25T22:00:00',
      '2026-10-26T22:00:00',
      '2026-10-27T22:00:00',
    ];
    const READINGS_PER_NIGHT = 32;

    // Each night carries one D-SLOT-1 row, repeated four times to fill its 32 readings. No magnitude
    // is invented: every night sum is exactly four times its D-SLOT-1 day sum.
    function nightReadings(): iConsumptionWindowSample[] {
      const readings: iConsumptionWindowSample[] = [];
      NIGHT_STARTS.forEach((nightStart, night) => {
        const startMs = new Date(nightStart).getTime();
        const row = D_SLOT_1_ROWS[night];
        for (let step = 0; step < READINGS_PER_NIGHT; step++) {
          // A quarter hour logger records every 15 minutes of elapsed time, so the readings inside a
          // single night really do advance in fixed steps. The bucketing must not. Dated at the end of
          // each interval, so the first closes at 22:15 and the last at 06:00.
          readings.push({ consumedKwh: row[step % row.length], date: new Date(startMs + (step + 1) * SLOT_MS) });
        }
      });
      return readings;
    }

    itInADaylightSavingZone('keeps every day of a window that straddles a daylight saving change fully covered', () => {
      const referenceFrom = new Date('2026-10-27T22:00:00').getTime();
      const referenceUntil = new Date('2026-10-28T06:00:00').getTime();
      const sums = EnergyHistoryUtils.windowConsumptionSums(
        nightReadings(),
        referenceFrom,
        referenceUntil,
        READING_INTERVAL_MS,
        // The value the settings default to. Fixed millisecond buckets lose about an hour of readings
        // on the far side of the change, which is 12.5 % of an eight hour night - just enough to fall
        // through this threshold, and the days that fall out are the older ones on one side of the
        // change, so the surviving sample is biased by season rather than thinned at random.
        0.9,
      );
      expect(sums).toHaveLength(NIGHT_STARTS.length);
      expect(sums.map((sample) => Number(sample.consumedKwh.toFixed(2)))).toEqual([12.56, 12.8, 13.04, 12.88, 12.72]);
    });

    itInADaylightSavingZone('gives every day the same reading count on both sides of the change', () => {
      const referenceFrom = new Date('2026-10-27T22:00:00').getTime();
      const referenceUntil = new Date('2026-10-28T06:00:00').getTime();
      // Demanding full coverage is the sharper probe: at 0.9 a single lost hour might still squeeze
      // through on a longer window, at 1 it never does.
      const sums = EnergyHistoryUtils.windowConsumptionSums(
        nightReadings(),
        referenceFrom,
        referenceUntil,
        READING_INTERVAL_MS,
        1,
      );
      expect(sums).toHaveLength(NIGHT_STARTS.length);
      // Ascending by date, and each night start is 22:00 local on its own calendar day - not 23:00,
      // which is where fixed millisecond steps put the older ones.
      expect(sums.map((sample) => sample.date.getHours())).toEqual([22, 22, 22, 22, 22]);
    });
  });

  describe('Y - the window reaches across the turn of the year', () => {
    // Every moment here is written as a local wall clock without an offset, the way the daylight saving
    // block above does it: the same source line reads as 22:00 in whichever zone the runner supplies, so
    // these cases mean the same thing under jest.config.js and under jest.dst.config.js.

    /**
     * The support points of a state of charge series, linearly interpolated onto the quarter hour grid -
     * the same shape as {@link socSeries}, but on local wall clock moments rather than on fixed CEST ones.
     * @param points - The support points as local moment and charge level in percent.
     * @returns The interpolated series.
     */
    function localSocSeries(points: Array<[string, number]>): iBatteryLevelSample[] {
      const keys = points.map(([at, level]) => ({ ms: new Date(at).getTime(), level }));
      const series: iBatteryLevelSample[] = [];
      for (let ms = keys[0].ms; ms <= keys[keys.length - 1].ms; ms += QUARTER_HOUR_MS) {
        series.push({ level: levelAt(keys, ms), date: new Date(ms) });
      }
      return series;
    }

    // A New Year's Eve that runs the battery down, a short rise at midnight and the real low of the night
    // well inside the new year. The two candidate lows are 18 points apart, so which side of midnight is
    // read is visible in the result rather than a matter of rounding.
    const TURN_OF_YEAR_SOC: iBatteryLevelSample[] = localSocSeries([
      ['2026-12-31T15:00:00', 70.0],
      ['2026-12-31T18:00:00', 58.0],
      ['2026-12-31T21:00:00', 46.0],
      ['2026-12-31T23:45:00', 38.0],
      ['2027-01-01T00:00:00', 39.0],
      ['2027-01-01T03:00:00', 33.0],
      ['2027-01-01T06:15:00', 27.0],
      ['2027-01-01T09:00:00', 35.0],
      ['2027-01-01T12:00:00', 48.0],
    ]);
    /** The moment the night is judged from: the last evening of the old year. */
    const NEW_YEARS_EVE = new Date('2026-12-31T18:00:00').getTime();
    /** The end of the morning window: the first sunrise of the new year plus a buffer hour, computed. */
    const NEW_YEAR_WINDOW_END =
      getSunrise(CITY_LATITUDE, CITY_LONGITUDE, new Date('2027-01-01T12:00:00')).getTime() + HOUR_MS;
    /** A window stopped a minute before midnight, so it cannot reach the new year at all. */
    const OLD_YEAR_ONLY_END = new Date('2026-12-31T23:59:00').getTime();

    it('Y1 reads the morning low of the new year, not the last low of the old one', () => {
      const acrossMidnight = EnergyHistoryUtils.deltaToNextMorningLow(
        TURN_OF_YEAR_SOC,
        NEW_YEARS_EVE,
        NEW_YEAR_WINDOW_END,
      );
      const oldYearOnly = EnergyHistoryUtils.deltaToNextMorningLow(TURN_OF_YEAR_SOC, NEW_YEARS_EVE, OLD_YEAR_ONLY_END);

      // 27.0 at 06:15 on the first of January against a starting level of 58.0.
      expect(acrossMidnight).toBeCloseTo(-31.0, 5);
      // The refuting half of the pair, same series and same evaluation moment: a window that stops at the
      // turn of the year finds 38.0 at 23:45 and reports 20 points instead of 31 - a night that looks
      // eleven points cheaper than it is, which is the suppressing direction. So the first assertion is
      // not one the arithmetic could satisfy by accident.
      expect(oldYearOnly).toBeCloseTo(-20.0, 5);
      expect(acrossMidnight).toBeLessThan(oldYearOnly as number);
    });

    // Ten nights of 22:00 to 06:00 over two consecutive turns of the year: 29 December to 2 January, once
    // ending in 2026 and once in 2027. Each night carries one D-SLOT-1 row four times over, so no
    // magnitude is invented and the two groups repeat the same five sums - which is exactly what makes a
    // day key that forgets the year visible.
    const NEW_YEAR_NIGHT_STARTS = [
      '2025-12-29T22:00:00',
      '2025-12-30T22:00:00',
      '2025-12-31T22:00:00',
      '2026-01-01T22:00:00',
      '2026-01-02T22:00:00',
      '2026-12-29T22:00:00',
      '2026-12-30T22:00:00',
      '2026-12-31T22:00:00',
      '2027-01-01T22:00:00',
      '2027-01-02T22:00:00',
    ];
    /** 22:00 to 06:00 on the quarter hour grid. */
    const READINGS_PER_NIGHT = 32;
    /** Four times a D-SLOT-1 day sum, in the order the rows are handed out. */
    const NIGHT_SUMS = [12.56, 12.8, 13.04, 12.88, 12.72];

    /**
     * Turns a list of night starts into the flat reading list a logger would have written.
     * @param nightStarts - The local moments the nights begin at.
     * @returns The readings, dated at the end of the interval each one closes.
     */
    function nightsFrom(nightStarts: string[]): iConsumptionWindowSample[] {
      const readings: iConsumptionWindowSample[] = [];
      nightStarts.forEach((nightStart, night) => {
        const startMs = new Date(nightStart).getTime();
        const row = D_SLOT_1_ROWS[night % D_SLOT_1_ROWS.length];
        for (let step = 0; step < READINGS_PER_NIGHT; step++) {
          readings.push({ consumedKwh: row[step % row.length], date: new Date(startMs + (step + 1) * SLOT_MS) });
        }
      });
      return readings;
    }

    it('Y2 gives every night across two turns of the year its own sum - no collision and no gap', () => {
      const sums = EnergyHistoryUtils.windowConsumptionSums(
        nightsFrom(NEW_YEAR_NIGHT_STARTS),
        new Date('2027-01-02T22:00:00').getTime(),
        new Date('2027-01-03T06:00:00').getTime(),
        READING_INTERVAL_MS,
        FULL_COVERAGE,
      );

      // Ten nights in, ten sums out. A bucket key that carried only month and day would fold the two
      // turns of the year onto each other and answer five.
      expect(sums).toHaveLength(NEW_YEAR_NIGHT_STARTS.length);
      expect(sums.map((sample) => Number(sample.consumedKwh.toFixed(2)))).toEqual([...NIGHT_SUMS, ...NIGHT_SUMS]);
      // The refuting half: under a collision each surviving sum would be the two nights added together,
      // about 25 kWh. No sum here is anywhere near that, so the count above is not met by two half filled
      // buckets either.
      expect(sums.every((sample) => sample.consumedKwh < 20)).toBe(true);

      // Ascending, and each sum sits on the calendar day its night began on - 31 December and 1 January
      // are two neighbouring entries of the list rather than one.
      expect(sums.map((sample) => sample.date.getFullYear())).toEqual([
        2025, 2025, 2025, 2026, 2026, 2026, 2026, 2026, 2027, 2027,
      ]);
      expect(sums.map((sample) => `${sample.date.getMonth() + 1}-${sample.date.getDate()}`)).toEqual([
        '12-29',
        '12-30',
        '12-31',
        '1-1',
        '1-2',
        '12-29',
        '12-30',
        '12-31',
        '1-1',
        '1-2',
      ]);
      expect(sums.map((sample) => sample.date.getHours())).toEqual(new Array(10).fill(22));
    });

    // The same five consecutive calendar days ending on 1 March, written out for a leap year and for the
    // year before it. Five days back from 1 March is 26 February in 2028 and 25 February in 2027, and the
    // leap year carries a 29 February the other one has no place for.
    const LEAP_NIGHT_STARTS = [
      '2028-02-26T22:00:00',
      '2028-02-27T22:00:00',
      '2028-02-28T22:00:00',
      '2028-02-29T22:00:00',
      '2028-03-01T22:00:00',
    ];
    const COMMON_YEAR_NIGHT_STARTS = [
      '2027-02-25T22:00:00',
      '2027-02-26T22:00:00',
      '2027-02-27T22:00:00',
      '2027-02-28T22:00:00',
      '2027-03-01T22:00:00',
    ];

    it('Y3 carries a window over the leap day, and over the February that has none', () => {
      /**
       * Sums the five nights of one year, measured back from its own 1 March.
       * @param nightStarts - The five night starts of that year.
       * @param referenceYear - The year the reference night lies in.
       * @returns One entry per night, as month and day.
       */
      function daysCovered(nightStarts: string[], referenceYear: number): string[] {
        const sums = EnergyHistoryUtils.windowConsumptionSums(
          nightsFrom(nightStarts),
          new Date(`${referenceYear}-03-01T22:00:00`).getTime(),
          new Date(`${referenceYear}-03-02T06:00:00`).getTime(),
          READING_INTERVAL_MS,
          FULL_COVERAGE,
        );
        expect(sums.map((sample) => Number(sample.consumedKwh.toFixed(2)))).toEqual(NIGHT_SUMS);
        return sums.map((sample) => `${sample.date.getMonth() + 1}-${sample.date.getDate()}`);
      }

      // The leap day is a day of its own and keeps its own night.
      expect(daysCovered(LEAP_NIGHT_STARTS, 2028)).toEqual(['2-26', '2-27', '2-28', '2-29', '3-1']);
      // The refuting half: the very same construction one year earlier reaches one day further back and
      // steps from 28 February straight to 1 March. A grid that assumed a fixed February would have to
      // get one of the two wrong.
      expect(daysCovered(COMMON_YEAR_NIGHT_STARTS, 2027)).toEqual(['2-25', '2-26', '2-27', '2-28', '3-1']);
    });
  });
});

function expectWithinFivePercent(model: iEnergyHistoryModel, truth: { intercept: number; weights: number[] }): void {
  model.weights.forEach((weight, index) => {
    expect(Math.abs(weight - truth.weights[index])).toBeLessThanOrEqual(Math.abs(truth.weights[index]) * 0.05);
  });
  expect(Math.abs(model.intercept - truth.intercept)).toBeLessThanOrEqual(Math.abs(truth.intercept) * 0.05);
}
