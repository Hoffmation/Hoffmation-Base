import { EnergyHistoryUtils } from '../../src/utils/energy-history-utils';
import { iConsumptionWindowSample } from '../../src/interfaces/iConsumptionWindowSample';
import { iEnergyHistoryModel } from '../../src/interfaces/iEnergyHistoryModel';
import { iEnergyHistorySample } from '../../src/interfaces/iEnergyHistorySample';

/**
 * The back test is an evaluating test, not a feature: it runs the fit the way the gate would and
 * reports how well it would have done on days it never saw. testdaten.md §11 supplies the data and
 * the answer, so what is under test here is the evaluation itself.
 *
 * The feature rows and the two ground truths are repeated from energy-history-utils.test.ts on
 * purpose - a shared fixture module would be a fifth file, and this lane owns four.
 */
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

const OLD_TRUTH = { intercept: -34.0, weights: [4.0, -0.25, -1.2, -0.6] };
const NEW_TRUTH = { intercept: 12.0, weights: [-1.5, 0.4, 0.9, 1.1] };

const BACKTEST_DAYS = 60;
/** The synthetic plant change: from this day on the target follows the second set of weights. */
const PLANT_CHANGE_DAY = 41;
const FIRST_EVALUATION_DAY = 51;
const DAY_MS = 24 * 60 * 60 * 1000;
const BACKTEST_START_MS = new Date('2026-04-17T12:00:00.000+02:00').getTime();
/**
 * 90 is the `historyWindowDays` default, so it belongs in the evaluation even though D-BACKTEST
 * only holds 60 days: beyond 50 available fit days the window saturates, and 90 therefore measures
 * the same fit as 60. That degeneracy is asserted below rather than hidden - the default must not be
 * the one number nobody looked at, and its true behaviour needs more than 60 days of history.
 */
const WINDOW_LENGTHS = [10, 20, 30, 60, 90];

/**
 * The back test needs its own floor, not the gate's: with historyMinimumDays 15 a ten day window
 * could never produce a model, and the shortest window is exactly the one under examination. Five
 * is the mathematical floor - four weights plus an intercept.
 */
const BACKTEST_MINIMUM_DAYS = 5;

/** Plan §7 stopper: suppress when the state of charge is at or above this. */
const TRIVIAL_THRESHOLD = 55;
/** minimumMorningSocReserve, the contract default. */
const RESERVE = 20;

/**
 * testdaten.md §10, D-CONS-WIN-SPREAD - a realistically spread consumption window. It carries the
 * N2 question: how often does an actual night exceed the assumed consumption?
 */
const D_CONS_WIN_SPREAD: iConsumptionWindowSample[] = [6.0, 9.5, 12.0, 14.5, 18.0, 26.0, 31.0].map(
  (consumedKwh, index) => ({ consumedKwh, date: new Date(BACKTEST_START_MS + index * DAY_MS) }),
);

/**
 * testdaten.md §10b - the two window sum sets that carry the question. Both share the same median
 * (3.20 kWh); only the spread separates them, which is exactly why an expected value alone cannot
 * tell a quiet night from a wallbox night.
 */
const D_SLOT_1_SUMS: iConsumptionWindowSample[] = [3.14, 3.2, 3.26, 3.22, 3.18].map((consumedKwh, index) => ({
  consumedKwh,
  date: new Date(BACKTEST_START_MS + index * DAY_MS),
}));
const D_SLOT_REGIME_SUMS: iConsumptionWindowSample[] = [3.2, 3.2, 3.2, 14.2, 14.2].map((consumedKwh, index) => ({
  consumedKwh,
  date: new Date(BACKTEST_START_MS + index * DAY_MS),
}));

const MEDIAN = 0.5;
const UPPER_QUANTILE = 0.9;
// This evaluation is about the spread of the sums, not about whether the gate may act on them, so the
// K18 minimum is set out of the way here. The gate's own minimum is Spur C's to set.
const NO_MINIMUM_SAMPLES = 1;
const BATTERY_CAPACITY_WH = 67000;

interface iDispersion {
  label: string;
  median: number;
  upper: number;
  /** How much higher the upper quantile sits, as a factor. */
  ratio: number;
  /** What the difference between the two is worth in state of charge points. */
  socPointGap: number;
}

// The measurement that replaces the assumption. The rule is always the same - take the upper
// quantile of the window sums - and it calibrates itself: where the scatter is mere interval noise
// the quantile sits close to the median and the surcharge is small of its own accord; where whole
// days move together it sits far above and the surcharge is large. No threshold is set anywhere,
// because a set threshold would be the same mistake as a set weight.
function dispersionOf(label: string, samples: iConsumptionWindowSample[]): iDispersion {
  const median = EnergyHistoryUtils.consumptionQuantileKwh(samples, MEDIAN, NO_MINIMUM_SAMPLES) as number;
  const upper = EnergyHistoryUtils.consumptionQuantileKwh(samples, UPPER_QUANTILE, NO_MINIMUM_SAMPLES) as number;
  return {
    label,
    median,
    upper,
    ratio: upper / median,
    socPointGap:
      EnergyHistoryUtils.worstCaseLowSoc(100, median, BATTERY_CAPACITY_WH) -
      EnergyHistoryUtils.worstCaseLowSoc(100, upper, BATTERY_CAPACITY_WH),
  };
}

const DISPERSIONS = [
  dispersionOf('D-SLOT-1 (interval noise)', D_SLOT_1_SUMS),
  dispersionOf('D-SLOT-REGIME (wallbox)', D_SLOT_REGIME_SUMS),
  dispersionOf('D-CONS-WIN-SPREAD', D_CONS_WIN_SPREAD),
];

function buildBacktestDays(): iEnergyHistorySample[] {
  const days: iEnergyHistorySample[] = [];
  for (let day = 1; day <= BACKTEST_DAYS; day++) {
    const row = FIT_FEATURE_ROWS[(day - 1) % FIT_FEATURE_ROWS.length];
    const repetition = Math.floor((day - 1) / FIT_FEATURE_ROWS.length);
    const shifted: [number, number, number, number] = [
      row[0] + 0.5 * repetition,
      row[1],
      row[2] + 0.5 * repetition,
      row[3],
    ];
    const truth = day < PLANT_CHANGE_DAY ? OLD_TRUTH : NEW_TRUTH;
    days.push({
      features: {
        remainingSunHours: shifted[0],
        cloudCover: shifted[1],
        consumedSoFarKwh: shifted[2],
        maxTemperature: shifted[3],
      },
      observedDelta: shifted.reduce((sum, value, column) => sum + value * truth.weights[column], truth.intercept),
      date: new Date(BACKTEST_START_MS + (day - 1) * DAY_MS),
    });
  }
  return days;
}

const BACKTEST = buildBacktestDays();
const EVALUATION_DAYS = BACKTEST.slice(FIRST_EVALUATION_DAY - 1);

interface iBacktestResult {
  windowDays: number;
  fitDayCount: number;
  fitDates: number[];
  model: iEnergyHistoryModel | undefined;
  /** Mean absolute error in state of charge points, or undefined when no statement was possible. */
  meanAbsoluteError: number | undefined;
  /** Share of evaluation days on which a statement was possible at all. */
  statementRate: number;
}

function runBacktest(windowDays: number, minimumDays: number): iBacktestResult {
  const lastFitDay = FIRST_EVALUATION_DAY - 1;
  const firstFitDay = Math.max(1, FIRST_EVALUATION_DAY - windowDays);
  const fitSamples = BACKTEST.slice(firstFitDay - 1, lastFitDay);
  const model = EnergyHistoryUtils.fit(fitSamples, minimumDays);

  let absoluteErrorSum = 0;
  let statements = 0;
  for (const day of EVALUATION_DAYS) {
    if (model === undefined) {
      continue;
    }
    const estimate = EnergyHistoryUtils.estimate(model, day.features, 0);
    absoluteErrorSum += Math.abs(estimate.expectedDelta - day.observedDelta);
    statements++;
  }

  return {
    windowDays,
    fitDayCount: fitSamples.length,
    fitDates: fitSamples.map((sample) => sample.date.getTime()),
    model,
    meanAbsoluteError: statements === 0 ? undefined : absoluteErrorSum / statements,
    statementRate: statements / EVALUATION_DAYS.length,
  };
}

/**
 * The trivial rule suppresses at a fixed state of charge. Against a reserve that means it asserts
 * the night costs at most `TRIVIAL_THRESHOLD - RESERVE` points - a constant prediction of the same
 * quantity, in the same unit, on the same days.
 */
const TRIVIAL_PREDICTED_DELTA = RESERVE - TRIVIAL_THRESHOLD;

function trivialMeanAbsoluteError(): number {
  const sum = EVALUATION_DAYS.reduce((total, day) => total + Math.abs(TRIVIAL_PREDICTED_DELTA - day.observedDelta), 0);
  return sum / EVALUATION_DAYS.length;
}

function quantileExceedanceRate(samples: iConsumptionWindowSample[], quantile: number): number {
  const bound = EnergyHistoryUtils.consumptionQuantileKwh(samples, quantile, NO_MINIMUM_SAMPLES);
  if (bound === undefined) {
    return 0;
  }
  return samples.filter((sample) => sample.consumedKwh > bound).length / samples.length;
}

const RESULTS = WINDOW_LENGTHS.map((windowDays) => runBacktest(windowDays, BACKTEST_MINIMUM_DAYS));
const TRIVIAL_ERROR = trivialMeanAbsoluteError();

describe('EnergyHistoryUtils back test (R22)', () => {
  beforeAll(() => {
    const lines: string[] = [
      '',
      '=== Dachs history back test - D-BACKTEST, 60 synthetic days, plant change at day 41 ===',
      `evaluated on days ${FIRST_EVALUATION_DAY}..${BACKTEST_DAYS} (${EVALUATION_DAYS.length} held back days), fit floor ${BACKTEST_MINIMUM_DAYS} days`,
      'window | fitDays | MAE (SoC points) | statement rate | fitted weights [sun, cloud, consumed, temp] | intercept | sigma',
    ];
    for (const result of RESULTS) {
      const weights =
        result.model === undefined ? 'no model' : result.model.weights.map((w) => w.toFixed(3)).join(', ');
      const intercept = result.model === undefined ? '-' : result.model.intercept.toFixed(3);
      const sigma = result.model === undefined ? '-' : result.model.residualSigma.toFixed(3);
      const mae = result.meanAbsoluteError === undefined ? 'no statement' : result.meanAbsoluteError.toFixed(4);
      lines.push(
        `${String(result.windowDays).padStart(6)} | ${String(result.fitDayCount).padStart(7)} | ${mae.padStart(16)} | ${(result.statementRate * 100).toFixed(0).padStart(13)}% | [${weights}] | ${intercept} | ${sigma}`,
      );
    }
    const best = RESULTS.filter((r) => r.meanAbsoluteError !== undefined).sort(
      (a, b) => (a.meanAbsoluteError as number) - (b.meanAbsoluteError as number),
    )[0];
    lines.push(`best window length: ${best.windowDays} days (MAE ${(best.meanAbsoluteError as number).toFixed(4)})`);
    lines.push(
      `trivial rule (suppress at SoC >= ${TRIVIAL_THRESHOLD}, reserve ${RESERVE}) on the same days: MAE ${TRIVIAL_ERROR.toFixed(4)}`,
    );
    lines.push(
      `verdict against the trivial rule: ${
        (best.meanAbsoluteError as number) < TRIVIAL_ERROR
          ? 'procedure wins'
          : 'procedure does NOT win - finding, not a failure'
      }`,
    );
    lines.push(
      `N2 - share of nights above the assumed consumption (D-CONS-WIN-SPREAD): median ${(
        quantileExceedanceRate(D_CONS_WIN_SPREAD, 0.5) * 100
      ).toFixed(0)}%, quantile 0.9 ${(quantileExceedanceRate(D_CONS_WIN_SPREAD, 0.9) * 100).toFixed(0)}%`,
    );
    lines.push('--- spread of the window sums: the surcharge is measured, never assumed ---');
    lines.push('window sums                | median kWh | q0.9 kWh | factor | surcharge in SoC points');
    for (const dispersion of DISPERSIONS) {
      lines.push(
        `${dispersion.label.padEnd(26)} | ${dispersion.median.toFixed(2).padStart(10)} | ${dispersion.upper
          .toFixed(2)
          .padStart(8)} | ${dispersion.ratio.toFixed(3).padStart(6)} | ${dispersion.socPointGap
          .toFixed(2)
          .padStart(23)}`,
      );
    }
    lines.push('');
    console.log(lines.join('\n'));
  });

  it('R22.1 scores a window on days it was not fitted on', () => {
    const evaluationDates = new Set(EVALUATION_DAYS.map((day) => day.date.getTime()));
    for (const result of RESULTS) {
      for (const fitDate of result.fitDates) {
        expect(evaluationDates.has(fitDate)).toBe(false);
      }
      expect(result.fitDayCount).toBe(Math.min(result.windowDays, FIRST_EVALUATION_DAY - 1));
    }
  });

  it('R22.2 shows that a shorter window scores better after a plant change', () => {
    // That every window produced a model at all is R22.4's assertion; this one is about their order.
    const errors = new Map(RESULTS.map((result) => [result.windowDays, result.meanAbsoluteError as number]));
    expect(errors.get(10) as number).toBeLessThan(0.5);
    expect(errors.get(60) as number).toBeGreaterThan(5 * (errors.get(10) as number) + 0.5);
    expect(errors.get(30) as number).toBeGreaterThan(errors.get(10) as number);
    expect(errors.get(20) as number).toBeGreaterThan(errors.get(10) as number);
    expect(errors.get(60) as number).toBeGreaterThanOrEqual(
      Math.max(...WINDOW_LENGTHS.map((w) => errors.get(w) as number)),
    );
  });

  it('R22.3 reports the trivial rule alongside, in the same unit on the same days', () => {
    expect(Number.isFinite(TRIVIAL_ERROR)).toBe(true);
    const best = Math.min(...RESULTS.map((result) => result.meanAbsoluteError as number));
    // The gap is built into the synthetic data; the assertion is that the comparison is computed
    // and reported at all, not that the procedure would win on the real plant (that is B5).
    expect(best).toBeLessThan(TRIVIAL_ERROR);
  });

  it('R22.4 reports the fitted weights and the statement rate per window length', () => {
    for (const result of RESULTS) {
      expect(result.model).toBeDefined();
      expect((result.model as iEnergyHistoryModel).weights).toHaveLength(4);
      expect(result.statementRate).toBe(1);
    }
    // The shortest window sits entirely inside the new regime, so it has to recover the new weights.
    const shortest = RESULTS.find((result) => result.windowDays === 10) as iBacktestResult;
    (shortest.model as iEnergyHistoryModel).weights.forEach((weight, index) => {
      expect(Math.abs(weight - NEW_TRUTH.weights[index])).toBeLessThanOrEqual(
        Math.abs(NEW_TRUTH.weights[index]) * 0.05,
      );
    });
  });

  it('reports a statement rate of zero when the window is shorter than the minimum', () => {
    const starved = runBacktest(10, 15);
    expect(starved.model).toBeUndefined();
    expect(starved.meanAbsoluteError).toBeUndefined();
    expect(starved.statementRate).toBe(0);
  });

  it('K8 the default window length is evaluated, and its degeneracy on 60 days is observable', () => {
    const sixty = RESULTS.find((result) => result.windowDays === 60) as iBacktestResult;
    const ninety = RESULTS.find((result) => result.windowDays === 90) as iBacktestResult;
    expect(ninety).toBeDefined();
    // Only 50 fit days exist, so both windows saturate on the same set - 90 is reported, not measured.
    expect(ninety.fitDayCount).toBe(sixty.fitDayCount);
    expect(ninety.meanAbsoluteError).toBe(sixty.meanAbsoluteError);
    // And the default is on the wrong side of the trivial rule at this window length.
    expect(ninety.meanAbsoluteError as number).toBeGreaterThan(TRIVIAL_ERROR);
  });

  it('measures the surcharge instead of assuming it, and needs no threshold to do so', () => {
    const [noise, regime] = DISPERSIONS;
    for (const dispersion of DISPERSIONS) {
      expect(Number.isFinite(dispersion.ratio)).toBe(true);
      // Always the upper quantile: it can never sit below the median, so the surcharge never turns
      // into a discount.
      expect(dispersion.upper).toBeGreaterThanOrEqual(dispersion.median);
      expect(dispersion.socPointGap).toBeGreaterThanOrEqual(0);
    }
    // Same median, so an expected value alone cannot separate the two lots at all.
    expect(noise.median).toBeCloseTo(regime.median, 5);
    // Self calibrating: interval noise yields a small surcharge, a day regime a large one.
    expect(noise.ratio).toBeCloseTo(1.014, 2);
    expect(regime.ratio).toBeCloseTo(4.44, 2);
    expect(noise.socPointGap).toBeLessThan(1);
    expect(regime.socPointGap).toBeGreaterThan(15);
  });

  it('N2 - a median is exceeded on about half the nights, an upper quantile far less often', () => {
    const medianExceedance = quantileExceedanceRate(D_CONS_WIN_SPREAD, 0.5);
    const upperExceedance = quantileExceedanceRate(D_CONS_WIN_SPREAD, 0.9);
    expect(medianExceedance).toBeGreaterThanOrEqual(0.4);
    expect(medianExceedance).toBeLessThanOrEqual(0.6);
    expect(upperExceedance).toBeLessThan(medianExceedance);
  });
});
