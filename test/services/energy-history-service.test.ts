import {
  Devices,
  EnergyHistoryService,
  EnergyHistoryUtils,
  EnergyManagerUtils,
  iConsumptionWindowSample,
  iEnergyHistoryModel,
  iEnergyHistoryOutlook,
  iEnergyHistorySample,
  iEnergyManager,
  iPersist,
  iWeatherDaySummary,
  LogLevel,
  Persistence,
  TimeCallbackService,
  Utils,
  WeatherService,
} from '../../src';
import {
  announceGenerator,
  BATTERY_CAPACITY_WATT_HOURS,
  DAY_MS,
  GENERATOR_CONVERSION_FACTOR,
  GENERATOR_RATED_WATTAGE,
  HOUR_MS,
  LogEntry,
  NO_STATE_OF_CHARGE,
  Plant,
  plant,
  plantPersistence,
  QueryWindow,
  tearDownPlant,
  TYPICAL_READING_KWH,
  TYPICAL_WINDOW_KWH,
  withRangeHonouringWeather,
  withReads,
  withThinnedDay,
} from '../support/plant-history';

jest.mock('unifi-access', () => jest.fn());

Utils.testInitializeServices();

/**
 * What the plant does with its own recorded history before anybody asks: which range it reads, how often it
 * reads it, what it fetches to fill the gaps, and what it hands the arithmetic.
 *
 * The unit of these cases is the **plant** rather than a consumer: an energy manager holding the one reading
 * of the recorded history, a persistence holding what was recorded, and the answer that comes out. What a
 * device then decides to do with that answer is that device's policy and lives with it, in
 * `test/devices/dachs-history-gate.test.ts`.
 *
 * All numbers below are synthetic; the coordinate is a city rather than an installation site.
 */

/** How many days of recorded history the arrangements offer, unless a case says otherwise. */
const OFFERED_DAYS: number = 40;
/** A charge level at which the model free bound of a typical night still holds a reserve of 20 %. */
const HIGH_SOC: number = 78;
/** One kWh expressed in charge points of the battery these cases run on. */
const POINTS_PER_KWH: number = (1000 / BATTERY_CAPACITY_WATT_HOURS) * 100;

/** A given model, never a fit result, so no case claims a weight (R7). */
const MODEL: iEnergyHistoryModel = {
  weights: [2.5, -0.1, -0.8, -0.3],
  intercept: 2.0,
  residualSigma: 4.0,
  sampleDays: 20,
};

/**
 * What the plant says about the coming morning, asked the way a consumer asks.
 * @returns The outlook, or undefined while the plant can say nothing.
 */
function outlook(): iEnergyHistoryOutlook | undefined {
  return Devices.energymanager?.morningOutlook;
}

/**
 * The warning lines that name one generator.
 * @param p - The plant to look at.
 * @param actuatorId - The generator to look for.
 * @returns The matching lines.
 */
function warningsNaming(p: Plant, actuatorId: string): LogEntry[] {
  return p.logs.filter((entry: LogEntry) => entry.level === LogLevel.Warn && entry.message.includes(actuatorId));
}

/**
 * The reads of one kind the persistence was asked for.
 * @param windows - The recorder.
 * @param method - The read to count.
 * @returns The matching reads.
 */
function readsOf(windows: QueryWindow[], method: string): QueryWindow[] {
  return windows.filter((window: QueryWindow) => window.method === method);
}

describe('the plant’s reading of its own recorded history', () => {
  afterEach(() => {
    tearDownPlant();
  });

  describe('R21, R6 - the sliding window and the time of day', () => {
    it('asks the persistence only for the configured window', async () => {
      const p: Plant = plant();
      const windows: QueryWindow[] = [];
      Persistence.dbo = plantPersistence({ days: 5, consumedTodayKwh: 3.0, windows });

      await p.load();

      // The consumption of the running day is read separately and deliberately narrower, so only the window
      // reads are measured here.
      const windowReads: QueryWindow[] = windows.filter((window: QueryWindow) => window.method !== 'today');
      expect(windowReads.length).toBeGreaterThanOrEqual(4);
      for (const window of windowReads) {
        const spanDays: number = (window.end.getTime() - window.start.getTime()) / DAY_MS;
        if (window.method === 'weather') {
          // The daily aggregates are dated at local midnight rather than at a moment of the day, so their
          // read starts at the midnight of the oldest day of the window: the same window, rounded down to
          // where its rows can be found at all. It reaches into that day and no further.
          expect(window.start.getHours()).toBe(0);
          expect(window.start.getMinutes()).toBe(0);
          expect(spanDays).toBeGreaterThanOrEqual(90);
          expect(spanDays).toBeLessThan(91);
          continue;
        }
        expect(spanDays).toBeCloseTo(90, 1);
      }
    });

    // A shortened window is followed to the day in the Y block below, which pins the start of both reads for
    // a configured 90 and a configured 30 days. That a window narrower than the offered history also reaches
    // the evaluation - not only the query - is stated by the oldest day case further down, which offers 120
    // days and bounds what the fit is handed.

    it('bounds the window with the sunrise the same service supplies the sunset from', async () => {
      /**
       * Reads what a plant expects the coming night to consume, with the morning low pinned.
       * @param horizonHours - How far ahead of any moment the morning low window ends.
       * @returns The bound in percent.
       */
      async function boundWithHorizon(horizonHours: number): Promise<number | undefined> {
        const p: Plant = plant();
        p.setBatteryLevel(HIGH_SOC);
        p.pinSun(9, horizonHours);
        const sunriseSpy = jest.spyOn(TimeCallbackService, 'getSunriseForDate');
        Persistence.dbo = plantPersistence({ days: OFFERED_DAYS, consumedTodayKwh: 3.0 });

        await p.load();

        // Both ends of one and the same window have to come out of one definition of the sun. Two libraries
        // put sunrise and sunset minutes apart, and the window would then be bounded by two different
        // mornings depending on which end is looked at.
        expect(sunriseSpy).toHaveBeenCalled();
        const bound: number | undefined = outlook()?.worstCaseLowSoc;
        tearDownPlant();
        return bound;
      }

      const twelveHours: number | undefined = await boundWithHorizon(12);
      const thirteenHours: number | undefined = await boundWithHorizon(13);

      // One hour more of window is four more quarter hour readings, which is exactly one kWh of this night.
      expect(twelveHours).toBeCloseTo(HIGH_SOC - TYPICAL_WINDOW_KWH * POINTS_PER_KWH, 6);
      expect(thirteenHours).toBeCloseTo(twelveHours! - POINTS_PER_KWH, 6);
    });

    it('keeps the oldest day of the window, whose aggregate is dated at midnight', async () => {
      const p: Plant = plant();
      Persistence.dbo = withRangeHonouringWeather(plantPersistence({ days: 120, consumedTodayKwh: 3.0 }));
      const handed: iEnergyHistorySample[][] = [];
      jest.spyOn(EnergyHistoryUtils, 'fit').mockImplementation((samples: iEnergyHistorySample[]) => {
        handed.push(samples);
        return MODEL;
      });
      const oldest: Date = new Date();
      oldest.setDate(oldest.getDate() - 90);

      await p.load();

      // A window start that carries the running time of day lies behind the midnight the oldest day's
      // aggregate is dated at, so that day loses its feature row - one day per window, every window.
      expect(
        handed[0].some((sample: iEnergyHistorySample) => sample.date.toDateString() === oldest.toDateString()),
      ).toBe(true);
      // And it stays a window: reaching further back than configured would be a different defect.
      expect(handed[0].length).toBeLessThanOrEqual(90);
    });

    it('takes every historical sample at the same time of day as the running evaluation', async () => {
      const p: Plant = plant();
      Persistence.dbo = plantPersistence({ days: 120, consumedTodayKwh: 3.0 });
      const handed: iEnergyHistorySample[][] = [];
      jest.spyOn(EnergyHistoryUtils, 'fit').mockImplementation((samples: iEnergyHistorySample[]) => {
        handed.push(samples);
        return MODEL;
      });
      const reference: Date = new Date();

      await p.load();

      expect(handed[0].length).toBeGreaterThan(0);
      for (const sample of handed[0]) {
        // Not midnight, and not the moment of the morning low - calendar proximity is no feature at all.
        const distance: number = Math.abs(
          sample.date.getHours() * 60 + sample.date.getMinutes() - (reference.getHours() * 60 + reference.getMinutes()),
        );
        expect(Math.min(distance, 24 * 60 - distance)).toBeLessThanOrEqual(1);
      }
    });

    it('lets the rated wattage and the conversion factor of an announced generator reach the correction', async () => {
      /**
       * Runs one history read of a plant whose unit is rated as given and reports what was subtracted.
       * @param ratedElectricalWattage - The rating to configure on the unit.
       * @param conversionFactor - The conversion factor to configure on the unit.
       * @returns The observed change, what was removed from it, and the ids the actuator read asked about.
       */
      async function correctionOf(
        ratedElectricalWattage: number,
        conversionFactor: number,
      ): Promise<{ observed: number; removed: number; askedIds: string[] }> {
        const p: Plant = plant();
        p.dachs.settings.dachsRatedElectricalWattage = ratedElectricalWattage;
        p.dachs.settings.dachsConversionFactor = conversionFactor;
        const windows: QueryWindow[] = [];
        Persistence.dbo = plantPersistence({ days: OFFERED_DAYS, consumedTodayKwh: 3.0, windows });
        const spy = jest.spyOn(EnergyHistoryUtils, 'correctForFossilGeneration');

        await p.load();

        expect(spy.mock.calls.length).toBeGreaterThan(0);
        expect(spy.mock.calls[0][1]).toHaveLength(1);
        expect(spy.mock.calls[0][1][0].ratedElectricalWattage).toBe(ratedElectricalWattage);
        expect(spy.mock.calls[0][1][0].conversionFactor).toBe(conversionFactor);
        expect(spy.mock.calls[0][1][0].runMilliseconds).toBeGreaterThan(0);
        const answer = {
          observed: spy.mock.calls[0][0],
          removed: spy.mock.calls[0][0] - (spy.mock.results[0].value as number),
          askedIds: readsOf(windows, 'actuator').map((window: QueryWindow) => window.id ?? ''),
          unitId: p.dachs.id,
        };
        // The id has to reach the query as well: a share subtracted from a run time nobody read is no
        // correction at all.
        expect(answer.askedIds).toContain(answer.unitId);
        tearDownPlant();
        return answer;
      }

      const strong = await correctionOf(GENERATOR_RATED_WATTAGE, GENERATOR_CONVERSION_FACTOR);
      const weak = await correctionOf(3000, 0.5);

      // Without this the two fields are decoration: they sit in the settings while the correction uses a
      // constant. Same observed change and same run time in both runs, so only the two settings can move it.
      expect(weak.observed).toBeCloseTo(strong.observed, 6);
      expect(strong.removed).toBeGreaterThan(weak.removed);
      expect(weak.removed).toBeGreaterThan(0);
    });

    it('carries the model free stages without any weather aggregates at all', async () => {
      const p: Plant = plant();
      p.setBatteryLevel(HIGH_SOC);
      Persistence.dbo = withReads(plantPersistence({ days: OFFERED_DAYS, consumedTodayKwh: 3.0 }), {
        getWeatherDaySummaries: () => Promise.resolve([]),
      } as unknown as Partial<iPersist>);

      await p.load();

      // The bound needs the state of charge and the consumption and nothing else. A plant that loses its
      // consumption windows because the weather side is empty is built and useless: the weather table starts
      // out empty on every installation.
      expect(outlook()?.worstCaseLowSoc).toBeCloseTo(HIGH_SOC - TYPICAL_WINDOW_KWH * POINTS_PER_KWH, 6);
      expect(outlook()?.sampleDays).toBe(0);
      expect(outlook()?.basis.weatherTodayKnown).toBe(false);
    });

    it('does not let a day with a gap lower the bound', async () => {
      /**
       * Reads the bound of a plant whose smallest recorded night is what the bound is taken from.
       * @param thinned - Whether one of the recorded days is thinned out to a single reading.
       * @param minimumCoverage - The coverage the plant demands, where a case states one.
       * @returns The bound in percent and how many windows it was read from.
       */
      async function smallestNight(
        thinned: boolean,
        minimumCoverage?: number,
      ): Promise<{ bound: number | undefined; windows: number | undefined }> {
        // The lowest quantile, so the bound reports the *smallest* window sum - which is what a day with a
        // gap would show up as, and what an upper quantile would hide.
        const dials: Record<string, number | undefined> = { historyConsumptionQuantile: 0 };
        if (minimumCoverage !== undefined) {
          dials.historyMinimumDayCoverage = minimumCoverage;
        }
        const p: Plant = plant(dials);
        p.setBatteryLevel(HIGH_SOC);
        const complete: iPersist = plantPersistence({ days: 20, consumedTodayKwh: 3.0 });
        Persistence.dbo = thinned ? withThinnedDay(complete, 5) : complete;

        await p.load();

        const answer = { bound: outlook()?.worstCaseLowSoc, windows: outlook()?.basis.consumptionWindows };
        tearDownPlant();
        return answer;
      }

      const full = await smallestNight(false);
      const gapped = await smallestNight(true);

      // The thinned day carries a single reading, so its sum is far too small. Counted in, it looks like a
      // frugal night, pulls the quantile down and makes the bound too optimistic - and a wrong suppression
      // has no way back.
      expect(full.windows ?? 0).toBeGreaterThan(1);
      expect(gapped.windows ?? 0).toBeLessThan(full.windows ?? 0);
      expect(gapped.bound).toBeCloseTo(full.bound!, 6);

      // The counter case: without it a rule that simply drops everything would pass the two above.
      const relaxed = await smallestNight(true, 0);
      expect(relaxed.windows ?? 0).toBeGreaterThan(gapped.windows ?? 0);
      expect(relaxed.bound!).toBeGreaterThan(gapped.bound!);
    });

    it('measures a longer horizon as a longer horizon, not as a shortened one', async () => {
      /**
       * Reads the bound of a plant whose morning low sits a given distance ahead.
       * @param horizonHours - How far ahead the morning low sits.
       * @returns The bound in percent and the basis it was stated on.
       */
      async function boundWithHorizon(
        horizonHours: number,
      ): Promise<{ bound: number; windows: number | undefined; readingsSeen: boolean | undefined }> {
        const p: Plant = plant();
        p.setBatteryLevel(HIGH_SOC);
        p.pinSun(9, horizonHours);
        Persistence.dbo = plantPersistence({ days: OFFERED_DAYS, consumedTodayKwh: 3.0 });

        await p.load();

        const answer = {
          bound: outlook()?.worstCaseLowSoc ?? Number.NaN,
          windows: outlook()?.basis.consumptionWindows,
          readingsSeen: outlook()?.basis.consumptionReadingsSeen,
        };
        tearDownPlant();
        return answer;
      }

      const withinADay = await boundWithHorizon(22);
      // The situation just after sunrise: the next morning low is more than a calendar day away, which is
      // longer than the per-day sums can be taken over.
      const beyondADay = await boundWithHorizon(24.2);

      // Shortening the window to keep the occurrences apart would understate the night, raise the bound and
      // suppress more often - so the longer horizon has to come out as the larger consumption.
      expect(beyondADay.bound).toBeLessThan(withinADay.bound);
      // And it is stated on a full basis. Falling silent here would mean two hours a day without the model
      // free stages - in the window where the decision weighs most - and a reason line blaming a history that
      // is present.
      expect(beyondADay.windows).toBeGreaterThanOrEqual(10);
      expect(beyondADay.readingsSeen).toBe(true);
    });

    it('characterises the running day out of the same stored field the weights were fitted on', async () => {
      const STORED_CLOUD_COVER: number = 90;
      const STORED_MAX_TEMPERATURE: number = 24;
      const p: Plant = plant();
      p.setBatteryLevel(35);
      // Only the stored aggregates carry these two numbers, for every day the answer covers - the running day
      // included. Nothing arms them anywhere else, so the running day can only get them from the same read.
      Persistence.dbo = plantPersistence({
        days: OFFERED_DAYS,
        consumedTodayKwh: 3.0,
        cloudCover: (): number => STORED_CLOUD_COVER,
        tempMax: (): number => STORED_MAX_TEMPERATURE,
      });
      // Driven apart on purpose: the live forecast carries 3 % and 12 °C, and the ratchet 31 °C. A fallback
      // to any of them shows as one of those numbers instead of the stored one.
      jest.spyOn(WeatherService, 'todayMaxTemp', 'get').mockReturnValue(31);
      const handed: iEnergyHistorySample[][] = [];
      // A given model rather than the fitted one: every stored day carries the same two numbers here, so the
      // fit is rank deficient by construction and honestly returns nothing. The model is an input to this
      // case, not its subject.
      jest.spyOn(EnergyHistoryUtils, 'fit').mockImplementation((samples: iEnergyHistorySample[]) => {
        handed.push(samples);
        return MODEL;
      });
      const estimateSpy = jest.spyOn(EnergyHistoryUtils, 'estimate');

      await p.load();
      void outlook();

      const applied = estimateSpy.mock.calls[estimateSpy.mock.calls.length - 1][1];
      expect(handed[0].length).toBeGreaterThan(0);
      // One field of one table on both sides. A weight measured on one quantity and applied to another is a
      // guessed weight again - only harder to see, because both carry the same unit and both look plausible.
      for (const sample of handed[0]) {
        expect(applied.cloudCover).toBeCloseTo(sample.features.cloudCover, 6);
        expect(applied.maxTemperature).toBeCloseTo(sample.features.maxTemperature, 6);
      }
      expect(applied.cloudCover).toBeCloseTo(STORED_CLOUD_COVER, 6);
      expect(applied.maxTemperature).toBeCloseTo(STORED_MAX_TEMPERATURE, 6);
    });

    it('says nothing about the model while no aggregate is stored for the running day', async () => {
      const p: Plant = plant();
      p.setBatteryLevel(35);
      jest.spyOn(EnergyHistoryUtils, 'fit').mockReturnValue(MODEL);
      // Historical days are stored, the running one is not - the state before the first backfill of the day.
      Persistence.dbo = plantPersistence({ days: OFFERED_DAYS, consumedTodayKwh: 3.0, todayWeather: false });

      await p.load();

      // No substitute value from anywhere else, and the answer says which of its inputs is missing.
      expect(outlook()?.basis.modelFitted).toBe(true);
      expect(outlook()?.basis.weatherTodayKnown).toBe(false);
      expect(outlook()?.band).toBeUndefined();
    });

    it('does not read the history at all while no battery capacity is reported', async () => {
      // Populated persistence, so a read would really happen - and an energy manager that states no capacity,
      // so the conversion between kWh and state of charge points is missing.
      const p: Plant = plant({ batteryCapacityWattage: undefined });
      announceGenerator('test-second-generator');
      const windows: QueryWindow[] = [];
      Persistence.dbo = plantPersistence({ days: OFFERED_DAYS, consumedTodayKwh: 3.0, windows });
      const fitSpy = jest.spyOn(EnergyHistoryUtils, 'fit');
      const correctionSpy = jest.spyOn(EnergyHistoryUtils, 'correctForFossilGeneration');
      p.resetRecordings();

      await p.load();

      // With a capacity of zero every generator day would enter the fit uncorrected - a failure that looks
      // like a model. So the read does not happen at all, and the log says why.
      expect(fitSpy).not.toHaveBeenCalled();
      expect(correctionSpy).not.toHaveBeenCalled();
      expect(readsOf(windows, 'levels')).toHaveLength(0);
      expect(p.logs.some((entry: LogEntry) => entry.message.includes('no usable battery capacity'))).toBe(true);
      // The generators are there and would be read; what is missing is the capacity, so a run cannot be
      // expressed in points of charge at all - a missing measurement, not a missing generator.
      expect(Devices.fossilGenerators.map((generator) => generator.actuatorId).sort()).toEqual(
        [p.dachs.id, 'test-second-generator'].sort(),
      );
    });

    it('reads the running day once per interval, not once per evaluation', async () => {
      const p: Plant = plant();
      const windows: QueryWindow[] = [];
      Persistence.dbo = plantPersistence({ days: 5, consumedTodayKwh: 3.0, windows });

      for (let run: number = 0; run < 10; run++) {
        await p.load();
      }
      const withinTheInterval: number = readsOf(windows, 'today').length;

      // Past the five minute interval, without touching the clock the rows were built on.
      p.advanceThrottles(6 * 60 * 1000);
      await p.load();

      // The window read has had a guard since K4; without one here the same silent storm returns one seam
      // further on, a query per battery and temperature update.
      expect(withinTheInterval).toBe(1);
      expect(readsOf(windows, 'today')).toHaveLength(2);
    });

    it('keeps its hourly interval after an unusable answer', async () => {
      const p: Plant = plant();
      const windows: QueryWindow[] = [];
      // Every read answers with nothing, which is an answer the plant can build nothing from.
      Persistence.dbo = plantPersistence({ days: 0, consumedTodayKwh: undefined, todayWeather: false, windows });

      for (let run: number = 0; run < 10; run++) {
        await p.load();
      }

      // A failed read that retries on the next evaluation means four ninety day queries per battery and
      // temperature update - and it would be silent, because the reason is only logged when it changes.
      expect(readsOf(windows, 'levels')).toHaveLength(1);
      expect(readsOf(windows, 'consumption')).toHaveLength(1);
    });

    it('reads the consumption of the running day again between two evaluations', async () => {
      const p: Plant = plant();
      p.setBatteryLevel(35);
      p.pinSun(9);
      jest.spyOn(EnergyHistoryUtils, 'fit').mockReturnValue(MODEL);
      const windows: QueryWindow[] = [];
      Persistence.dbo = plantPersistence({ days: OFFERED_DAYS, consumedTodayKwh: 3.0, windows });

      await p.load();
      const before: number = outlook()?.band?.lower ?? Number.NaN;

      // The same day, an hour and a half of consumption later.
      Persistence.dbo = plantPersistence({ days: OFFERED_DAYS, consumedTodayKwh: 4.5, windows });
      p.advanceThrottles(6 * 60 * 1000);
      await p.load();
      const after: number = outlook()?.band?.lower ?? Number.NaN;

      // The historical samples carry a full reading up to their moment; a running day served from the hourly
      // window cache would show systematically less and tilt the model towards suppressing. Under the given
      // model 1.5 kWh more consumption are 1.2 points less projected charge.
      expect(after).toBeCloseTo(before - 1.2, 6);
      const todayReads: QueryWindow[] = readsOf(windows, 'today');
      expect(todayReads.length).toBeGreaterThanOrEqual(2);
      for (const read of todayReads) {
        expect(read.start.getHours()).toBe(0);
        expect(read.start.getMinutes()).toBe(0);
      }
    });
  });

  describe('M - the quality bar of the recorded data is stated by the plant', () => {
    it('M2 - calculates the model free bound at the quantile the energy manager states', async () => {
      /**
       * Reads the bound of a plant over a spread of nights.
       * @param quantile - The quantile the energy manager states.
       * @returns The bound in percent.
       */
      async function boundAtQuantile(quantile: number): Promise<number> {
        const p: Plant = plant({ historyConsumptionQuantile: quantile });
        p.setBatteryLevel(HIGH_SOC);
        // A spread of nights rather than the all-equal set of the other cases: over identical nights every
        // quantile is the same number and the case would pass without reading the dial at all.
        Persistence.dbo = plantPersistence({
          days: 20,
          consumedTodayKwh: 3.0,
          readingKwh: (day: number): number => 0.1 + 0.01 * day,
        });

        await p.load();

        const bound: number = outlook()?.worstCaseLowSoc ?? Number.NaN;
        tearDownPlant();
        return bound;
      }

      const lowQuantile: number = await boundAtQuantile(0.1);
      const highQuantile: number = await boundAtQuantile(0.9);

      // The dial has to reach the arithmetic, not only the call: an upper quantile of the same nights is a
      // heavier night than a lower one, so the bound it leaves has to be the lower of the two.
      expect(highQuantile).toBeLessThan(lowQuantile);
    });

    /**
     * A service of its own rather than a consumer's, so what it answers cannot come from a consumer's
     * settings - they are not in the picture at all.
     * @returns A service on the dials of one question, with the plant side left to the energy manager.
     */
    function standaloneService(): EnergyHistoryService {
      return new EnergyHistoryService({ windowDays: 90, minimumModelDays: 15, bandSigma: 1.0 }, (): void => {
        // Deliberately empty - these two cases assert on the answer, not on the log.
      });
    }

    it('M3 - keeps answering on the contract bar while no energy manager states one', () => {
      plant();
      const service: EnergyHistoryService = standaloneService();
      Devices.energymanager = undefined;

      service.refresh();
      const answer: iEnergyHistoryOutlook = service.outlook(50, new Date());

      // Two energy managers exist and installations have neither, so an absent one has to keep the number
      // the installation had. The bar is a default and not a substitute for a measurement - unlike the
      // capacity, whose absence really is a missing input and does silence the answer.
      expect(answer.basis.requiredConsumptionWindows).toBe(10);
      expect(answer.basis.batteryCapacityKnown).toBe(false);
      expect(answer.remainingSunHours).toBeGreaterThanOrEqual(0);
    });

    it('M3b - reports the stated bar rather than the contract one once an energy manager carries it', () => {
      plant({ historyMinimumConsumptionDays: 4 });
      const service: EnergyHistoryService = standaloneService();

      service.refresh();
      const answer: iEnergyHistoryOutlook = service.outlook(50, new Date());

      // The counter case to M3: without it a bar wired to a constant would pass there just as well.
      expect(answer.basis.requiredConsumptionWindows).toBe(4);
    });
  });

  describe('a marker for "no reading" is told from a charge level in one place', () => {
    it('answers nothing while the manager reports no charge level, in either of its two shapes', async () => {
      const p: Plant = plant();
      Persistence.dbo = plantPersistence({ days: OFFERED_DAYS, consumedTodayKwh: 3.0 });
      await p.load();
      expect(outlook()).toBeDefined();

      // Run through the projection the marker moves the whole band, and on a clear morning that band still
      // clears the reserve - so a consumer would be answered at exactly the charge level at which it must
      // not be. A manager without a battery at all lands in the same branch, and rightly.
      p.setBatteryLevel(NO_STATE_OF_CHARGE);
      expect(outlook()).toBeUndefined();

      // The other shape: a manager that states its capacity but carries no charge level field at all. An
      // absent reading is not a charge level of zero; a projection started from one is invented.
      const withoutABattery: iEnergyManager = {
        deviceCapabilities: [],
        settings: p.managerSettings,
        log: (): void => {
          // Deliberately empty.
        },
      } as unknown as iEnergyManager;
      expect(EnergyManagerUtils.morningOutlook(withoutABattery)).toBeUndefined();
    });
  });

  describe('R17, K3 - the daily weather aggregates are actually fetched', () => {
    it('runs the backfill for the window the plant states', async () => {
      const standard: Plant = plant();
      Persistence.dbo = plantPersistence({ days: 0, consumedTodayKwh: 3.0 });

      await standard.load();

      // Without a caller in the production code the weather table stays empty forever, and with it the model
      // side of every consumer never gets a basis.
      expect(standard.backfillRuns).toHaveLength(1);
      expect(standard.backfillRuns[0].historyWindowDays).toBe(90);
      tearDownPlant();

      const shortened: Plant = plant({ historyWindowDays: 30 });
      Persistence.dbo = plantPersistence({ days: 0, consumedTodayKwh: 3.0 });

      await shortened.load();

      expect(shortened.backfillRuns[0].historyWindowDays).toBe(30);
    });

    it('does not fetch anything while an input the whole chain needs is missing', async () => {
      const withoutAPersistence: Plant = plant();
      // The fetched day is written to the persistence and read back from there; without one the whole chain
      // is guaranteed to answer nothing, so every day fetched meanwhile is quota spent against a paid
      // endpoint for an answer that cannot come. Order, not a switch: the cheap checks come first.
      Persistence.dbo = undefined;

      await withoutAPersistence.load();

      expect(withoutAPersistence.backfillRuns).toHaveLength(0);
      tearDownPlant();

      // The other missing input: without a capacity there is no conversion between kWh and charge points, so
      // the service is guaranteed to stay silent even though the persistence is there and populated.
      const withoutACapacity: Plant = plant({ batteryCapacityWattage: undefined });
      Persistence.dbo = plantPersistence({ days: 0, consumedTodayKwh: 3.0 });

      await withoutACapacity.load();

      expect(withoutACapacity.backfillRuns).toHaveLength(0);
    });

    it('does not fetch again on the next evaluation', async () => {
      const p: Plant = plant();
      Persistence.dbo = plantPersistence({ days: 0, consumedTodayKwh: 3.0 });

      for (let run: number = 0; run < 3; run++) {
        await p.load();
      }

      // The window moves by one day a day; fetching per evaluation would drain the quota in minutes.
      expect(p.backfillRuns).toHaveLength(1);
    });
  });

  describe('K11, K12 - the generator list is read per entry, not as one all-or-nothing block', () => {
    /** Two synthetic generators alongside the plant's unit - the state one entry more of the same list makes. */
    const GENERATOR_A: string = 'test-generator-a';
    const GENERATOR_B: string = 'test-generator-b';

    /**
     * A plant with two announced generators beside its unit, whose second generator's read answers as told.
     * @param answerForB - What the read of the second generator answers.
     * @param windows - Where the asked ranges are written to.
     * @returns The plant, after one full read of the window.
     */
    async function plantWithTwoGenerators(
      answerForB: () => Promise<never[]>,
      windows: QueryWindow[] = [],
    ): Promise<Plant> {
      const p: Plant = plant();
      announceGenerator(GENERATOR_A);
      announceGenerator(GENERATOR_B);
      const source: iPersist = plantPersistence({ days: 30, consumedTodayKwh: 3.0, windows });
      Persistence.dbo = withReads(source, {
        getActuatorHistory: (id: string, start: Date, end: Date) =>
          id === GENERATOR_B ? answerForB() : source.getActuatorHistory(id, start, end),
      } as unknown as Partial<iPersist>);
      p.resetRecordings();

      await p.load();

      return p;
    }

    it('K11-1 keeps the whole history when one of two generator reads is rejected, and names that one', async () => {
      const p: Plant = await plantWithTwoGenerators(() => Promise.reject(new Error('actuator history unavailable')));

      // The consumption windows and the model have nothing to do with that one generator, and they stand.
      expect(outlook()?.basis.consumptionWindows ?? 0).toBeGreaterThan(0);
      expect(p.logs.some((entry: LogEntry) => entry.message.includes('has no data basis'))).toBe(false);

      const named: LogEntry[] = warningsNaming(p, GENERATOR_B);
      expect(named).toHaveLength(1);
      expect(named[0].message).toContain('actuator history unavailable');
      expect(warningsNaming(p, GENERATOR_A)).toHaveLength(0);
    });

    it('K11-2 names a configured generator the window holds no runtime for, once and not again', async () => {
      const windows: QueryWindow[] = [];
      const p: Plant = await plantWithTwoGenerators(() => Promise.resolve([]), windows);

      const named: LogEntry[] = warningsNaming(p, GENERATOR_B);
      expect(named).toHaveLength(1);
      expect(named[0].message).toContain('nothing is subtracted for it');
      // The generator that did run is not named - a line about every configured unit would be noise.
      expect(warningsNaming(p, GENERATOR_A)).toHaveLength(0);

      p.resetRecordings();
      windows.length = 0;

      // Past the hourly interval, so the window really is read a second time.
      p.advanceThrottles(2 * HOUR_MS);
      await p.load();

      // Measured rather than assumed: without a second read of the window there is no second chance to write
      // the line at all, and the case would pass on the throttle instead of on the remembered state.
      expect(readsOf(windows, 'levels')).toHaveLength(1);
      // A unit that legitimately stands still for a season would otherwise produce a line an hour for months.
      expect(warningsNaming(p, GENERATOR_B)).toHaveLength(0);
    });

    it('K12-2 removes the shares of two announced generators additively', async () => {
      /**
       * Runs one history read of a plant with the given number of generators and reports the correction.
       * @param second - Whether a second generator is announced beside the unit.
       * @returns The observed change and what was removed from it.
       */
      async function correction(second: boolean): Promise<{ observed: number; removed: number; runs: number }> {
        const p: Plant = plant();
        if (second) {
          announceGenerator(GENERATOR_A);
        }
        Persistence.dbo = plantPersistence({ days: OFFERED_DAYS, consumedTodayKwh: 3.0 });
        const spy = jest.spyOn(EnergyHistoryUtils, 'correctForFossilGeneration');

        await p.load();

        const answer = {
          observed: spy.mock.calls[0][0],
          removed: spy.mock.calls[0][0] - (spy.mock.results[0].value as number),
          runs: spy.mock.calls[0][1].length,
        };
        tearDownPlant();
        return answer;
      }

      const one = await correction(false);
      const two = await correction(true);

      expect(one.runs).toBe(1);
      expect(two.runs).toBe(2);
      // Same observed change and the same rating in both reads, so only the second generator can move the
      // result - and it moves it by exactly its own share rather than by some blend of the two.
      expect(two.observed).toBeCloseTo(one.observed, 3);
      expect(one.removed).toBeGreaterThan(0);
      expect(two.removed / one.removed).toBeCloseTo(2, 3);
    });

    it('K12-4 counts a generator that only appears after the first read', async () => {
      const p: Plant = plant();
      Persistence.dbo = plantPersistence({ days: OFFERED_DAYS, consumedTodayKwh: 3.0 });
      const spy = jest.spyOn(EnergyHistoryUtils, 'correctForFossilGeneration');

      await p.load();
      const firstRead: number = spy.mock.calls.length;
      expect(spy.mock.calls[0][1]).toHaveLength(1);

      // The weak point of reading the device list instead of collecting registrations is the other way round
      // from an ordering problem: nothing announces a change, so a late generator has to be found by the next
      // read rather than reported into an already built list.
      announceGenerator(GENERATOR_A);
      p.advanceThrottles(2 * HOUR_MS);
      await p.load();

      expect(spy.mock.calls.length).toBeGreaterThan(firstRead);
      expect(spy.mock.calls[firstRead][1]).toHaveLength(2);
    });
  });

  describe('Y - a January evening, whose window reaches into the previous year', () => {
    /**
     * The wall clock these cases run on. A mid-January evening: the ninety day window then starts in the
     * previous year, and every day of the recorded history the plant reads crosses the turn of the year -
     * the one date an installation reaches every single year, in the season the history matters most.
     */
    const TURN_OF_YEAR_MOMENT: Date = new Date(2027, 0, 15, 18, 0, 0, 0);

    /**
     * Everything a fake clock can take over except the Date itself. These cases need one thing from it - a
     * wall clock in January - while the reads they start have to settle on the real timers `Plant.load`
     * waits on.
     */
    const ONLY_THE_DATE_IS_FAKED = [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ] as const;

    /**
     * Puts the wall clock on the given moment. Called after {@link plant}, which builds its unit on the
     * real clock and hands the timers back before it returns.
     * @param moment - The moment every `new Date()` of the run answers with.
     */
    function pinWallClock(moment: Date): void {
      jest.useFakeTimers({ doNotFake: [...ONLY_THE_DATE_IS_FAKED], now: moment });
    }

    afterEach(() => {
      jest.useRealTimers();
    });

    it('asks for a window that starts in the previous year, right to the day', async () => {
      /**
       * Reads which range one history read of a plant with the given window asks the persistence for.
       * @param windowDays - How long the window is configured to be.
       * @returns The start of the timestamped read and the start of the daily aggregate read.
       */
      async function askedRange(windowDays: number): Promise<{ start: Date; weatherStart: Date }> {
        const p: Plant = plant({ historyWindowDays: windowDays });
        pinWallClock(TURN_OF_YEAR_MOMENT);
        const windows: QueryWindow[] = [];
        Persistence.dbo = plantPersistence({ days: 5, consumedTodayKwh: 3.0, windows });

        await p.load();

        const answer = {
          start: readsOf(windows, 'levels')[0].start,
          weatherStart: readsOf(windows, 'weather')[0].start,
        };
        tearDownPlant();
        jest.useRealTimers();
        return answer;
      }

      const ninetyDays = await askedRange(90);
      const thirtyDays = await askedRange(30);

      // 17 October 2026, countable by hand: fourteen more days of October, thirty of November, thirty-one
      // of December and the fifteen of January that have passed.
      expect(ninetyDays.start.getFullYear()).toBe(2026);
      expect(ninetyDays.start.getMonth() + 1).toBe(10);
      expect(ninetyDays.start.getDate()).toBe(17);
      // And it carries the running time of day, so the day it reaches into is compared at the same hour.
      expect(ninetyDays.start.getHours()).toBe(18);
      // The daily aggregates are dated at local midnight, so their read starts at the midnight of that
      // same day of the previous year rather than a few hours into it.
      expect(ninetyDays.weatherStart.getFullYear()).toBe(2026);
      expect(ninetyDays.weatherStart.getMonth() + 1).toBe(10);
      expect(ninetyDays.weatherStart.getDate()).toBe(17);
      expect(ninetyDays.weatherStart.getHours()).toBe(0);

      // The refuting half of the pair: a shortened window still crosses the turn of the year, but lands on
      // 16 December 2026. A start pinned to a constant, or one that loses or gains a month where the year
      // rolls over, cannot satisfy both of these.
      expect(thirtyDays.start.getFullYear()).toBe(2026);
      expect(thirtyDays.start.getMonth() + 1).toBe(12);
      expect(thirtyDays.start.getDate()).toBe(16);
      expect(thirtyDays.start.getHours()).toBe(18);
    });

    it('gives the aggregate of 31 December to 31 December, not to the one a year older', async () => {
      /** Quantities no stored day of this arrangement can carry, so a mismatch is readable off the value. */
      const STALE_CLOUD_COVER: number = 95;
      const STALE_MAX_TEMPERATURE: number = 95;
      const p: Plant = plant();
      pinWallClock(TURN_OF_YEAR_MOMENT);
      // Every stored day carries its own distance back from the evaluation moment: cloud cover as the
      // number of days, maximum temperature as half of it. So which day an aggregate came from is
      // readable off the feature row rather than argued.
      const source: iPersist = plantPersistence({
        days: 40,
        consumedTodayKwh: 3.0,
        cloudCover: (day: number): number => day,
        tempMax: (day: number): number => day / 2,
      });
      Persistence.dbo = withReads(source, {
        getWeatherDaySummaries: async (start: Date, end: Date): Promise<iWeatherDaySummary[]> => [
          // A row for the 31 December one year before the window, put in front of the answer. The
          // stand-in answers more generously than it was asked anyway, and a database whose range filter
          // cuts differently at the edge does the same. Whoever matches on month and day alone finds this
          // one first and reads a year old sky into the last day of the old year.
          { date: new Date(2025, 11, 31), cloudCover: STALE_CLOUD_COVER, tempMin: 8, tempMax: STALE_MAX_TEMPERATURE },
          ...(await source.getWeatherDaySummaries(start, end)),
        ],
      } as unknown as Partial<iPersist>);
      const handed: iEnergyHistorySample[][] = [];
      // A given model rather than a fitted one: the fit is an input here, not the subject.
      jest.spyOn(EnergyHistoryUtils, 'fit').mockImplementation((samples: iEnergyHistorySample[]) => {
        handed.push(samples);
        return MODEL;
      });

      await p.load();

      const byDay: Map<string, iEnergyHistorySample> = new Map(
        handed[0].map((sample: iEnergyHistorySample) => [sample.date.toDateString(), sample]),
      );
      const lastOfTheOldYear: iEnergyHistorySample | undefined = byDay.get(new Date(2026, 11, 31).toDateString());
      const firstOfTheNewYear: iEnergyHistorySample | undefined = byDay.get(new Date(2027, 0, 1).toDateString());
      expect(lastOfTheOldYear).toBeDefined();
      expect(firstOfTheNewYear).toBeDefined();
      // 31 December 2026 is fifteen days before the evaluation moment, 1 January 2027 is fourteen. Each
      // day got its own sky and its own maximum, and the neighbouring one got the other.
      expect(lastOfTheOldYear!.features.cloudCover).toBe(15);
      expect(lastOfTheOldYear!.features.maxTemperature).toBe(7.5);
      expect(firstOfTheNewYear!.features.cloudCover).toBe(14);
      expect(firstOfTheNewYear!.features.maxTemperature).toBe(7);
      // The refuting half: the year old row is in the answer, and it is in front of the real one. Nothing
      // picked it up - not for the day it shares its month and day with, and not for any other day.
      expect(handed[0].some((s: iEnergyHistorySample) => s.features.cloudCover === STALE_CLOUD_COVER)).toBe(false);
      expect(handed[0].some((s: iEnergyHistorySample) => s.features.maxTemperature === STALE_MAX_TEMPERATURE)).toBe(
        false,
      );
      // Both days also produced an observed change at all, so the morning low was found on either side of
      // midnight rather than only before it.
      expect(Number.isFinite(lastOfTheOldYear!.observedDelta)).toBe(true);
      expect(Number.isFinite(firstOfTheNewYear!.observedDelta)).toBe(true);
    });

    it('sums one night per day across the turn of the year - none lost and none counted twice', async () => {
      /** How many days of recorded history this arrangement offers; twenty-five reach back to 21 December. */
      const OFFERED_NIGHTS: number = 25;
      /** How much heavier each day back is than its successor, so no two nights share a sum. */
      const READING_STEP_KWH: number = 0.001;
      const p: Plant = plant();
      p.setBatteryLevel(HIGH_SOC);
      pinWallClock(TURN_OF_YEAR_MOMENT);
      Persistence.dbo = plantPersistence({
        days: OFFERED_NIGHTS,
        consumedTodayKwh: 3.0,
        readingKwh: (day: number): number => TYPICAL_READING_KWH + day * READING_STEP_KWH,
      });
      // The seam the window sums cross on their way into the bound; spied on rather than reconstructed,
      // because the count alone cannot tell a lost night from a doubled one.
      const quantileSpy = jest.spyOn(EnergyHistoryUtils, 'consumptionQuantileKwh');

      await p.load();
      expect(outlook()?.worstCaseLowSoc).toBeDefined();

      const sums: iConsumptionWindowSample[] = quantileSpy.mock.calls[0][0];
      expect(sums).toHaveLength(OFFERED_NIGHTS);
      expect(outlook()?.basis.consumptionWindows).toBe(OFFERED_NIGHTS);

      // Oldest first: twenty-five consecutive calendar days from 21 December 2026 to 14 January 2027, each
      // at the evaluation hour. Written out as one list, so a night that fell out shows as a missing date
      // and a night counted twice as a repeated one - neither of which a bare count would reveal.
      const covered: string[] = sums.map(
        (sample: iConsumptionWindowSample) =>
          `${sample.date.getFullYear()}-${sample.date.getMonth() + 1}-${sample.date.getDate()}`,
      );
      const expected: string[] = [];
      for (let day: number = 21; day <= 31; day++) {
        expected.push(`2026-12-${day}`);
      }
      for (let day: number = 1; day <= 14; day++) {
        expected.push(`2027-1-${day}`);
      }
      expect(covered).toEqual(expected);
      expect(new Set(covered).size).toBe(OFFERED_NIGHTS);
      expect(sums.every((sample: iConsumptionWindowSample) => sample.date.getHours() === 18)).toBe(true);

      // Each night is one interval of the evening plus one of the morning, both twenty-four readings long,
      // so its sum follows from the two days it is made of and no two nights coincide. The refuting half:
      // a night stitched together from the wrong pair of days, or one counted into its neighbour, lands on
      // a value that is not in this list at all.
      const expectedSums: number[] = [];
      for (let nightsBack: number = OFFERED_NIGHTS; nightsBack >= 1; nightsBack--) {
        expectedSums.push(
          24 * (TYPICAL_READING_KWH + nightsBack * READING_STEP_KWH) +
            24 * (TYPICAL_READING_KWH + (nightsBack - 1) * READING_STEP_KWH),
        );
      }
      sums.forEach((sample: iConsumptionWindowSample, index: number) => {
        expect(sample.consumedKwh).toBeCloseTo(expectedSums[index], 6);
      });
      // Strictly ordered, so the two neighbours of the turn of the year are distinguishable at all.
      for (let index: number = 1; index < sums.length; index++) {
        expect(sums[index].consumedKwh).toBeLessThan(sums[index - 1].consumedKwh);
      }
    });
  });
});
