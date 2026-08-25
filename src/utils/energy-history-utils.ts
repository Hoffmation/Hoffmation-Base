import { iActuatorStateSample } from '../interfaces/iActuatorStateSample';
import { iBatteryLevelSample } from '../interfaces/iBatteryLevelSample';
import { iConsumptionWindowSample } from '../interfaces/iConsumptionWindowSample';
import { iEnergyHistoryEstimate } from '../interfaces/iEnergyHistoryEstimate';
import { iEnergyHistoryFeatures } from '../interfaces/iEnergyHistoryFeatures';
import { iEnergyHistoryModel } from '../interfaces/iEnergyHistoryModel';
import { iEnergyHistorySample } from '../interfaces/iEnergyHistorySample';
import { iFossilGeneratorRun } from '../interfaces/iFossilGeneratorRun';

/** The declaration order of iEnergyHistoryFeatures - the fit and the model tuple follow it. */
const FEATURE_COUNT = 4;
/** Least squares needs one observation per fitted parameter: four weights plus the intercept. */
const MINIMUM_FITTABLE_SAMPLES = FEATURE_COUNT + 1;
const MILLISECONDS_PER_HOUR = 3_600_000;
const WATT_HOURS_PER_KWH = 1000;
const PERCENT_FACTOR = 100;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

/**
 * Pure arithmetic over what the plant's own history says: how the state of charge developed towards
 * a morning low, and how much the house consumed over a window.
 *
 * This answers questions about the plant, not about any one device. A device asking "where will the
 * battery bottom out tomorrow morning" is a caller here; what it then decides to do about the answer
 * is that device's own policy and stays with it.
 *
 * Nothing in here reads persistence, devices, settings or the clock - every input arrives as a
 * parameter. That is what makes the back test in test/utils/energy-history-backtest.test.ts
 * checkable without a harness. No method throws; unusable input yields `undefined` or `0`.
 */
export class EnergyHistoryUtils {
  /**
   * Fits the weights from history by ordinary least squares over the four features plus an
   * intercept. The weights are never written by hand - they come out of this fit.
   * @param samples - The observations to fit from; this method uses these and nothing else.
   * @param minimumDays - Below this many usable observations no model is produced at all.
   * @returns The fitted model, or `undefined` when there is too little or unusable history.
   */
  public static fit(samples: iEnergyHistorySample[], minimumDays: number): iEnergyHistoryModel | undefined {
    const usable = samples.filter((sample) => EnergyHistoryUtils.isUsableSample(sample));
    if (usable.length < Math.max(minimumDays, MINIMUM_FITTABLE_SAMPLES)) {
      return undefined;
    }

    const featureRows = usable.map((sample) => EnergyHistoryUtils.toFeatureVector(sample.features));
    const targets = usable.map((sample) => sample.observedDelta);
    const featureMeans = EnergyHistoryUtils.columnMeans(featureRows);
    const targetMean = targets.reduce((sum, value) => sum + value, 0) / targets.length;

    // Centering the columns before the normal equations keeps the 4x4 system well conditioned and
    // moves the intercept out of the matrix - it is recovered from the means afterwards.
    const normalMatrix: number[][] = EnergyHistoryUtils.zeroMatrix(FEATURE_COUNT);
    const normalVector: number[] = new Array(FEATURE_COUNT).fill(0);
    for (let row = 0; row < featureRows.length; row++) {
      const centered = featureRows[row].map((value, column) => value - featureMeans[column]);
      const centeredTarget = targets[row] - targetMean;
      for (let i = 0; i < FEATURE_COUNT; i++) {
        for (let j = 0; j < FEATURE_COUNT; j++) {
          normalMatrix[i][j] += centered[i] * centered[j];
        }
        normalVector[i] += centered[i] * centeredTarget;
      }
    }

    const solution = EnergyHistoryUtils.solve(normalMatrix, normalVector);
    if (solution === undefined) {
      return undefined;
    }
    const intercept = targetMean - solution.reduce((sum, weight, column) => sum + weight * featureMeans[column], 0);

    let residualSquareSum = 0;
    for (let row = 0; row < featureRows.length; row++) {
      const predicted = featureRows[row].reduce((sum, value, column) => sum + value * solution[column], intercept);
      residualSquareSum += (targets[row] - predicted) ** 2;
    }
    // Residual standard error: the degrees of freedom left after five parameters were spent.
    const degreesOfFreedom = Math.max(featureRows.length - MINIMUM_FITTABLE_SAMPLES, 1);
    const residualSigma = Math.sqrt(residualSquareSum / degreesOfFreedom);

    const weights: [number, number, number, number] = [solution[0], solution[1], solution[2], solution[3]];
    if (!weights.every((weight) => Number.isFinite(weight)) || !Number.isFinite(intercept)) {
      return undefined;
    }
    if (!Number.isFinite(residualSigma)) {
      return undefined;
    }
    return { weights, intercept, residualSigma, sampleDays: featureRows.length };
  }

  /**
   * Applies the model and widens the point estimate into a band.
   * @param model - The fitted model to apply.
   * @param features - The four quantities the prediction is based on.
   * @param bandSigma - How many residual sigmas each edge lies away from the point estimate.
   * @returns The point estimate together with its lower and upper edge.
   */
  public static estimate(
    model: iEnergyHistoryModel,
    features: iEnergyHistoryFeatures,
    bandSigma: number,
  ): iEnergyHistoryEstimate {
    const featureVector = EnergyHistoryUtils.toFeatureVector(features);
    const expectedDelta = featureVector.reduce(
      (sum, value, column) => sum + value * model.weights[column],
      model.intercept,
    );
    const rawBand = bandSigma * model.residualSigma;
    // The magnitude keeps the edges ordered even for a negative sigma - a band never flips over.
    const band = Number.isFinite(rawBand) ? Math.abs(rawBand) : 0;
    return {
      expectedDelta,
      lowerEdgeDelta: expectedDelta - band,
      upperEdgeDelta: expectedDelta + band,
      sampleDays: model.sampleDays,
    };
  }

  /**
   * Removes what the fuel burning generators contributed from an observed change, so the sample
   * describes what the photovoltaic system alone would have achieved.
   *
   * The generators are summed rather than branched over: every one of them pushed watt hours into
   * the same battery over the same window, so their shares of the state of charge simply add up. A
   * second unit is therefore one more list entry and needs no change here.
   * @param observedDelta - The raw change in percentage points.
   * @param generators - What each fuel burning generator ran inside the same window; an empty list
   * means nothing is subtracted.
   * @param batteryCapacityWattHours - Usable battery capacity, shared by all of them.
   * @returns The corrected change; never above the observed change, and the input unchanged when
   * nothing usable was handed over.
   */
  public static correctForFossilGeneration(
    observedDelta: number,
    generators: iFossilGeneratorRun[],
    batteryCapacityWattHours: number,
  ): number {
    if (!Number.isFinite(observedDelta)) {
      return observedDelta;
    }
    if (!Number.isFinite(batteryCapacityWattHours) || batteryCapacityWattHours <= 0) {
      // Without a capacity no run can be expressed in points of charge at all, so no entry survives.
      return observedDelta;
    }
    let socPoints = 0;
    for (const generator of generators) {
      // Judged per entry, not over the list: a run of an unknown size is worse than none and drops
      // out, while the runs that are known stay in. An unusable entry therefore under-corrects the
      // sample, which makes the photovoltaic look better than it was.
      const runUsable =
        Number.isFinite(generator.runMilliseconds) &&
        generator.runMilliseconds > 0 &&
        Number.isFinite(generator.ratedElectricalWattage) &&
        generator.ratedElectricalWattage > 0 &&
        Number.isFinite(generator.conversionFactor) &&
        generator.conversionFactor > 0;
      if (!runUsable) {
        continue;
      }
      const runHours = generator.runMilliseconds / MILLISECONDS_PER_HOUR;
      socPoints +=
        ((runHours * generator.ratedElectricalWattage * generator.conversionFactor) / batteryCapacityWattHours) *
        PERCENT_FACTOR;
    }
    if (!Number.isFinite(socPoints)) {
      return observedDelta;
    }
    return observedDelta - socPoints;
  }

  /**
   * The change in state of charge from a given moment to the low point within the window that
   * follows it. The window is passed in - this class never reads the clock.
   * @param samples - The persisted state of charge readings, in any order.
   * @param fromMs - The moment of evaluation.
   * @param untilMs - End of the window, that is the following sunrise plus a buffer hour.
   * @returns The change in percentage points, or `undefined` when the data does not cover the
   * window or holds no reading at the moment of evaluation.
   */
  public static deltaToNextMorningLow(
    samples: iBatteryLevelSample[],
    fromMs: number,
    untilMs: number,
  ): number | undefined {
    if (!Number.isFinite(fromMs) || !Number.isFinite(untilMs) || untilMs <= fromMs) {
      return undefined;
    }
    let startLevel: number | undefined = undefined;
    let startMs = Number.NEGATIVE_INFINITY;
    let lastMs = Number.NEGATIVE_INFINITY;
    let low: number | undefined = undefined;
    for (const sample of samples) {
      const sampleMs = sample.date?.getTime();
      if (sampleMs === undefined || !Number.isFinite(sampleMs) || !Number.isFinite(sample.level)) {
        continue;
      }
      if (sampleMs > lastMs) {
        lastMs = sampleMs;
      }
      if (sampleMs <= fromMs && sampleMs > startMs) {
        startMs = sampleMs;
        startLevel = sample.level;
      }
      // Strictly after the moment of evaluation: the reading at that moment is the starting point,
      // not a candidate for the low that follows it.
      if (sampleMs > fromMs && sampleMs <= untilMs && (low === undefined || sample.level < low)) {
        low = sample.level;
      }
    }
    if (startLevel === undefined || low === undefined) {
      return undefined;
    }
    if (lastMs < untilMs) {
      // The series stops before the window ends, so the following morning is simply not in the
      // data. Reporting the lowest value seen so far would invent a low point.
      return undefined;
    }
    return low - startLevel;
  }

  /**
   * Total milliseconds the actuator was on within a window, from its recorded state changes.
   * @param samples - The recorded state changes, in any order.
   * @param fromMs - Start of the window.
   * @param toMs - End of the window.
   * @returns The on time in milliseconds; `0` when nothing is known about the window.
   */
  public static onMillisecondsWithin(samples: iActuatorStateSample[], fromMs: number, toMs: number): number {
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
      return 0;
    }
    const ordered = samples
      .filter((sample) => Number.isFinite(sample.date?.getTime()))
      .map((sample) => ({ on: sample.on === true, ms: sample.date.getTime() }))
      .sort((a, b) => a.ms - b.ms);
    if (ordered.length === 0) {
      return 0;
    }

    const before = ordered.filter((sample) => sample.ms <= fromMs);
    const inside = ordered.filter((sample) => sample.ms > fromMs && sample.ms < toMs);
    let state: boolean;
    if (before.length > 0) {
      state = before[before.length - 1].on;
    } else if (inside.length > 0) {
      // Nothing is recorded before the window, but a recorded change is a transition: the state it
      // switches away from is the state the window started in. Reading a leading "off" as "was on"
      // over-counts the generator share at worst, and over-counting errs towards one run too many
      // rather than towards a night that does not carry.
      state = !inside[0].on;
    } else {
      state = false;
    }

    let cursorMs = fromMs;
    let onMilliseconds = 0;
    for (const sample of inside) {
      if (state) {
        onMilliseconds += sample.ms - cursorMs;
      }
      cursorMs = sample.ms;
      state = sample.on;
    }
    if (state) {
      onMilliseconds += toMs - cursorMs;
    }
    return onMilliseconds;
  }

  /**
   * Where the state of charge would bottom out if no further photovoltaic yield arrived at all.
   * @param currentSoc - The state of charge right now in percent.
   * @param expectedConsumptionKwh - House consumption expected over the window ahead.
   * @param batteryCapacityWattHours - Usable battery capacity.
   * @returns The bound in percent, never below zero, and `0` for an unusable capacity.
   */
  public static worstCaseLowSoc(
    currentSoc: number,
    expectedConsumptionKwh: number,
    batteryCapacityWattHours: number,
  ): number {
    if (!Number.isFinite(currentSoc)) {
      return 0;
    }
    const startingPoint = Math.max(currentSoc, 0);
    if (!Number.isFinite(batteryCapacityWattHours) || batteryCapacityWattHours <= 0) {
      // Pessimistic on purpose: a zero bound never suppresses and at most requests, so an unusable
      // capacity errs towards one run too many instead of towards a night that does not carry.
      return 0;
    }
    if (!Number.isFinite(expectedConsumptionKwh) || expectedConsumptionKwh <= 0) {
      return startingPoint;
    }
    const socPoints = ((expectedConsumptionKwh * WATT_HOURS_PER_KWH) / batteryCapacityWattHours) * PERCENT_FACTOR;
    if (!Number.isFinite(socPoints)) {
      return startingPoint;
    }
    return Math.max(startingPoint - socPoints, 0);
  }

  /**
   * House consumption over the same window on the days handed in, taken at an upper quantile
   * rather than at the median: the bound has to hold on a heavy night, not on half of them.
   *
   * Below `minimumSamples` there is no answer at all, the same discipline `fit` keeps. An upper
   * quantile of one night IS that night, and of two nights it sits all but on their maximum - so a
   * single quiet night would produce a low expected consumption, a high bound and a suppression with
   * nothing behind it. The measured spread makes the size of that error concrete: at a day regime the
   * upper quantile sits more than four times above the median, which is some sixteen state of charge
   * points that simply do not exist while the sample is one night long.
   * @param samples - The consumption windows of the historical days.
   * @param quantile - The quantile to read, between 0 and 1.
   * @param minimumSamples - Fewer usable window sums than this yield no answer.
   * @returns The consumption in kWh, or `undefined` for too small a sample - never a zero, which
   * would read as "nothing expected" and suppress without any data at all.
   */
  public static consumptionQuantileKwh(
    samples: iConsumptionWindowSample[],
    quantile: number,
    minimumSamples: number,
  ): number | undefined {
    if (!Number.isFinite(quantile) || !Number.isFinite(minimumSamples)) {
      return undefined;
    }
    const values = samples
      .map((sample) => sample.consumedKwh)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
    if (values.length === 0 || values.length < minimumSamples) {
      return undefined;
    }
    // Linear interpolation between the two neighbouring order statistics, so the median of an even
    // count is the mean of the two middle values.
    const position = Math.min(Math.max(quantile, 0), 1) * (values.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) {
      return values[lower];
    }
    return values[lower] + (position - lower) * (values[upper] - values[lower]);
  }

  /**
   * One window sum per historical day: for the same time of day window as the one handed in, the sum
   * of that day's readings inside it.
   *
   * This is the step that makes the uncertainty measurable rather than assumed. The expected
   * consumption is the median of the returned sums, the bound their upper quantile - both read with
   * consumptionQuantileKwh. The quantile belongs on the sums and never on the individual readings:
   * summing per reading quantiles would apply the safety margin once per interval instead of once per
   * window, which is markedly more.
   *
   * A day whose readings do not cover the window is dropped, not patched. Its sum would be too small
   * and would therefore look like a frugal night, pulling the median down and making the bound too
   * optimistic - the direction that suppresses a start the house needed.
   *
   * Windows longer than a calendar day are allowed. "The same window one day earlier" then overlaps
   * its own neighbour, and a reading in the shared stretch belongs to both occurrences - so it is
   * counted in both sums, because each sum answers "what did this window consume" and both windows
   * really did contain it. Only a partition would have to choose, and no partition is needed here.
   * @param readings - The persisted consumption readings of one measuring interval each, in any order.
   * Each is dated at the END of the interval it closes, the way the persistence hands them over.
   * @param fromMs - Start of the window under evaluation.
   * @param untilMs - End of the window under evaluation.
   * @param readingIntervalMs - Length of one measuring interval, so that the expected number of
   * readings per window follows from the window rather than from the data.
   * @param minimumCoverage - Share of the expected readings a day must carry to be counted, 0 to 1.
   * @returns One sum per sufficiently covered day, ascending by window start; empty when none
   * qualifies. Each returned sample is dated at the START of its window.
   */
  public static windowConsumptionSums(
    readings: iConsumptionWindowSample[],
    fromMs: number,
    untilMs: number,
    readingIntervalMs: number,
    minimumCoverage: number,
  ): iConsumptionWindowSample[] {
    if (!Number.isFinite(fromMs) || !Number.isFinite(untilMs) || untilMs <= fromMs) {
      return [];
    }
    const windowMs = untilMs - fromMs;
    if (!Number.isFinite(readingIntervalMs) || readingIntervalMs <= 0 || !Number.isFinite(minimumCoverage)) {
      return [];
    }
    const expectedReadings = Math.round(windowMs / readingIntervalMs);
    if (expectedReadings <= 0) {
      return [];
    }

    const usable = readings.filter(
      (reading) => Number.isFinite(reading.date?.getTime()) && Number.isFinite(reading.consumedKwh),
    );
    if (usable.length === 0) {
      return [];
    }
    let earliestMs = Number.POSITIVE_INFINITY;
    let latestMs = Number.NEGATIVE_INFINITY;
    for (const reading of usable) {
      const readingMs = reading.date.getTime();
      earliestMs = Math.min(earliestMs, readingMs);
      latestMs = Math.max(latestMs, readingMs);
    }

    // One occurrence of the same wall clock window per calendar day the readings can reach. Shifting
    // by whole calendar days rather than by 86400000 ms is what keeps the window at the same time of
    // day across a daylight saving change - fixed millisecond steps move every occurrence on the far
    // side of the change by an hour, which costs those days part of their coverage and drops them.
    // Days drop out on one side of the change, so the surviving sample would be biased by season.
    const occurrences = new Map<number, { fromMs: number; untilMs: number }>();
    const firstOffset = Math.floor((earliestMs - untilMs) / MILLISECONDS_PER_DAY) - 1;
    const lastOffset = Math.ceil((latestMs - fromMs) / MILLISECONDS_PER_DAY) + 1;
    for (let offset = firstOffset; offset <= lastOffset; offset++) {
      occurrences.set(offset, {
        fromMs: EnergyHistoryUtils.shiftCalendarDays(fromMs, offset),
        untilMs: EnergyHistoryUtils.shiftCalendarDays(untilMs, offset),
      });
    }

    // How many neighbouring occurrences a reading can reach: one per calendar day the window spans,
    // plus one for the 23, 24 or 25 hour spread of a calendar day itself.
    const reachableOffsets = Math.ceil(windowMs / MILLISECONDS_PER_DAY) + 1;
    const perDay = new Map<number, { sum: number; count: number }>();
    for (const reading of usable) {
      const readingMs = reading.date.getTime();
      const estimate = Math.round((readingMs - fromMs) / MILLISECONDS_PER_DAY);
      // No early exit: a reading inside two overlapping occurrences counts towards both sums.
      for (let offset = estimate - reachableOffsets; offset <= estimate + reachableOffsets; offset++) {
        const occurrence = occurrences.get(offset);
        // Half open (from, until], the convention iPersist.getEnergyConsumptionHistory documents: a
        // reading is dated at the END of the interval it closes, so the one dated at `from` closes the
        // interval before the window and the one dated at `until` closes the window's last interval.
        // Reversing the two edges keeps the reading count and therefore the coverage intact, so the
        // sum would silently describe a window shifted by one interval.
        if (occurrence === undefined || readingMs <= occurrence.fromMs || readingMs > occurrence.untilMs) {
          continue;
        }
        const bucket = perDay.get(offset) ?? { sum: 0, count: 0 };
        bucket.sum += reading.consumedKwh;
        bucket.count++;
        perDay.set(offset, bucket);
      }
    }

    return [...perDay.entries()]
      .filter(([, bucket]) => bucket.count / expectedReadings >= minimumCoverage)
      .sort((a, b) => a[0] - b[0])
      .map(([offset, bucket]) => ({
        consumedKwh: bucket.sum,
        date: new Date(EnergyHistoryUtils.shiftCalendarDays(fromMs, offset)),
      }));
  }

  /**
   * The same moment shifted by whole calendar days, keeping its time of day.
   * @param ms - The moment to shift.
   * @param days - How many calendar days to add; negative shifts into the past.
   * @returns The shifted moment in milliseconds.
   */
  private static shiftCalendarDays(ms: number, days: number): number {
    const shifted = new Date(ms);
    shifted.setDate(shifted.getDate() + days);
    return shifted.getTime();
  }

  private static isUsableSample(sample: iEnergyHistorySample): boolean {
    return (
      Number.isFinite(sample.observedDelta) &&
      EnergyHistoryUtils.toFeatureVector(sample.features).every((value) => Number.isFinite(value))
    );
  }

  private static toFeatureVector(features: iEnergyHistoryFeatures): number[] {
    return [features.remainingSunHours, features.cloudCover, features.consumedSoFarKwh, features.maxTemperature];
  }

  private static columnMeans(rows: number[][]): number[] {
    const means = new Array(FEATURE_COUNT).fill(0);
    for (const row of rows) {
      for (let column = 0; column < FEATURE_COUNT; column++) {
        means[column] += row[column];
      }
    }
    return means.map((sum) => sum / rows.length);
  }

  private static zeroMatrix(size: number): number[][] {
    return Array.from({ length: size }, () => new Array(size).fill(0));
  }

  /**
   * Gaussian elimination with partial pivoting.
   * @param matrix - The square coefficient matrix of the normal equations.
   * @param vector - The right hand side.
   * @returns The solution, or `undefined` when the system has no unique one.
   */
  private static solve(matrix: number[][], vector: number[]): number[] | undefined {
    const size = vector.length;
    const work = matrix.map((row, index) => [...row, vector[index]]);
    const scale = Math.max(...work.flat().map((value) => Math.abs(value)), 1);
    const tolerance = scale * 1e-12;

    for (let column = 0; column < size; column++) {
      let pivotRow = column;
      for (let row = column + 1; row < size; row++) {
        if (Math.abs(work[row][column]) > Math.abs(work[pivotRow][column])) {
          pivotRow = row;
        }
      }
      if (Math.abs(work[pivotRow][column]) < tolerance) {
        // Rank deficient: at least two features moved in lockstep, so their weights cannot be told
        // apart. No model at all is the honest answer.
        return undefined;
      }
      [work[column], work[pivotRow]] = [work[pivotRow], work[column]];
      for (let row = column + 1; row < size; row++) {
        const factor = work[row][column] / work[column][column];
        for (let target = column; target <= size; target++) {
          work[row][target] -= factor * work[column][target];
        }
      }
    }

    const solution = new Array(size).fill(0);
    for (let row = size - 1; row >= 0; row--) {
      let sum = work[row][size];
      for (let column = row + 1; column < size; column++) {
        sum -= work[row][column] * solution[column];
      }
      solution[row] = sum / work[row][row];
    }
    return solution.every((value) => Number.isFinite(value)) ? solution : undefined;
  }
}
