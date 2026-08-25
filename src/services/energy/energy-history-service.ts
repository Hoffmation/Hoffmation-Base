import {
  iActuatorStateSample,
  iConsumptionWindowSample,
  iEnergyHistoryBasis,
  iEnergyHistoryFeatures,
  iEnergyHistoryModel,
  iEnergyHistoryOptions,
  iEnergyHistoryOutlook,
  iEnergyHistorySample,
  iFossilGeneratorRun,
  iFossilGeneratorSource,
  iPersist,
  iProjectedSocBand,
  iWeatherDaySummary,
} from '../../interfaces';
import { LogLevel } from '../../enums';
import { EnergyHistoryUtils, Utils } from '../../utils';
import { Devices } from '../../devices';
import { Persistence } from '../dbo';
import { TimeCallbackService } from '../time-callback-service';
import { WeatherHistoryBackfill } from '../weather';
import { iPlantEnergyDials } from './plant-energy-dials';

const DAY_MS: number = 24 * 60 * 60 * 1000;
const HOUR_MS: number = 60 * 60 * 1000;
/** How long after sunrise the morning low is still counted. */
const MORNING_LOW_BUFFER_MS: number = HOUR_MS;
/** How long a history read is reused before the persistence is asked again - a failed one included. */
const HISTORY_RELOAD_INTERVAL_MS: number = HOUR_MS;
/** How long the consumption of the running day is reused - see {@link refreshTodayConsumption}. */
const CONSUMPTION_RELOAD_INTERVAL_MS: number = 5 * 60 * 1000;
/**
 * How long between two backfill runs of the daily weather aggregates. Shorter than the one day the window
 * moves by, because the running day's row is a forecast rewritten as the day goes on and is read as a
 * feature; days already stored are skipped, so the shorter interval costs at most one call.
 */
const WEATHER_BACKFILL_INTERVAL_MS: number = HOUR_MS;

/**
 * Length of one persisted consumption interval, so the expected number of readings per window follows from the
 * window rather than from the data. Not a setting but a property of this code: both energy managers write
 * their calculation on this interval, and changing their database logger interval changes this one too.
 */
const CONSUMPTION_READING_INTERVAL_MS: number = 15 * 60 * 1000;

/** The quality bar while no energy manager states one; unlike the battery capacity, all three have one. */
const DEFAULT_MINIMUM_DAY_COVERAGE: number = 0.9;
const DEFAULT_CONSUMPTION_QUANTILE: number = 0.9;
const DEFAULT_MINIMUM_CONSUMPTION_DAYS: number = 10;

/**
 * What the plant's own recorded history says about the night ahead: where the state of charge will bottom out
 * towards the coming morning, and how certain that is.
 *
 * **Passive** - no timer of its own, so read, backfill and fit happen only inside a {@link refresh} call and
 * an owner that does not ask spends no request quota. **One instance for the whole plant**, held by the energy
 * manager: a second would pay the bounded weather backfill twice a day and split the model shadow into two
 * half samples of a measurement that only means anything whole.
 */
export class EnergyHistoryService {
  private readonly options: iEnergyHistoryOptions;
  private readonly log: (level: LogLevel, message: string) => void;
  /** One entry per historical day: what the house consumed from the evaluation moment to the morning low. */
  private _consumptionSamples: iConsumptionWindowSample[] | undefined;
  /** Whether the last read answered with consumption readings at all, so an empty result can be explained. */
  private _consumptionReadingsSeen: boolean = false;
  /** The stored daily weather aggregate of the running day. */
  private _weatherToday: iWeatherDaySummary | undefined;
  /** The consumption readings of the running day. */
  private _consumptionToday: iConsumptionWindowSample[] | undefined;
  private _consumptionTodayAttemptedAt: number = 0;
  private _consumptionTodayRunning: boolean = false;
  private _historyModel: iEnergyHistoryModel | undefined;
  /** When the window was last read - set on the attempt, so a failed read waits just as long as a good one. */
  private _historyAttemptedAt: number = 0;
  private _historyLoadRunning: boolean = false;
  private _weatherBackfillAttemptedAt: number = 0;
  private _weatherBackfillRunning: boolean = false;
  /** The reason there currently is no data basis, kept so it is logged on change instead of every run. */
  private _historyIssue: string | undefined;
  /**
   * The generators already reported as carrying no runtime, so the change is reported rather than the state -
   * a unit that legitimately stands still for a season would otherwise produce a line an hour for months.
   */
  private readonly _generatorsWithoutRuntime: Set<string> = new Set<string>();

  /**
   * Builds the plant's history. Nothing is read until {@link refresh} is called.
   * @param options - How the recorded history is read and fitted, read anew on every use; hand in a live view
   * when they are editable at runtime. How good the data has to be is read off the manager, see
   * {@link iPlantEnergyDials}.
   * @param log - Where to write to; handed in so the lines appear under the asking device.
   */
  public constructor(options: iEnergyHistoryOptions, log: (level: LogLevel, message: string) => void) {
    this.options = options;
    this.log = log;
  }

  /**
   * What the plant can say about the coming morning low, from what was read so far. Pure arithmetic over the
   * cached reads - it never reaches for the persistence itself, that is {@link refresh}.
   * @param currentSoc - The state of charge in percent the projection starts from.
   * @param moment - The moment the outlook is asked about.
   * @returns The outlook, including which of its inputs were missing.
   */
  public outlook(currentSoc: number, moment: Date): iEnergyHistoryOutlook {
    const remainingSunHours: number = this.remainingSunHoursAt(moment);
    const model: iEnergyHistoryModel | undefined = this._historyModel;
    const windowSums: iConsumptionWindowSample[] = this._consumptionSamples ?? [];
    // Without a capacity there is no conversion between kWh and charge points, so the bound is left out rather
    // than calculated as zero - a zero bound reads as "the morning is empty".
    const capacityWattHours: number | undefined = this.batteryCapacityWattHours;
    const consumptionKwh: number | undefined =
      capacityWattHours === undefined
        ? undefined
        : EnergyHistoryUtils.consumptionQuantileKwh(windowSums, this.consumptionQuantile, this.minimumConsumptionDays);
    const worstCaseLowSoc: number | undefined =
      consumptionKwh === undefined || capacityWattHours === undefined
        ? undefined
        : EnergyHistoryUtils.worstCaseLowSoc(currentSoc, consumptionKwh, capacityWattHours);

    // Both weather quantities come out of the same field of the same table the historical samples are built
    // from. Read anywhere else they would be a different quantity with the same unit, and a weight measured on
    // one quantity and applied to another is a guessed weight.
    const today: iWeatherDaySummary | undefined = this._weatherToday;
    const consumedSoFarKwh: number | undefined = this.consumedTodayKwh(moment);
    const features: iEnergyHistoryFeatures | undefined =
      today === undefined || consumedSoFarKwh === undefined
        ? undefined
        : {
            remainingSunHours,
            cloudCover: today.cloudCover,
            consumedSoFarKwh,
            maxTemperature: today.tempMax,
          };
    let band: iProjectedSocBand | undefined = undefined;
    if (model !== undefined && features !== undefined) {
      const estimate = EnergyHistoryUtils.estimate(model, features, this.options.bandSigma);
      band = { lower: currentSoc + estimate.lowerEdgeDelta, upper: currentSoc + estimate.upperEdgeDelta };
    }

    const basis: iEnergyHistoryBasis = {
      batteryCapacityKnown: capacityWattHours !== undefined,
      consumptionWindows: windowSums.length,
      requiredConsumptionWindows: this.minimumConsumptionDays,
      consumptionReadingsSeen: this._consumptionReadingsSeen,
      weatherTodayKnown: today !== undefined,
      consumptionTodayKnown: consumedSoFarKwh !== undefined,
      modelFitted: model !== undefined,
    };
    return {
      currentSoc,
      remainingSunHours,
      worstCaseLowSoc,
      band,
      residualSigma: model?.residualSigma,
      sampleDays: model?.sampleDays ?? 0,
      basis,
    };
  }

  /**
   * Reads everything that has gone stale: the daily weather aggregates, the consumption of the running day and
   * the sliding history window. Each of the three throttles itself, so calling this on every decision is what
   * it is built for.
   */
  public refresh(): void {
    // These two guards are the whole protection of the request quota; there is no switch in front of any of
    // this. While either is missing the service answers nothing, so a day fetched meanwhile is paid for
    // nothing. Capacity first: it is also what the generator share of a historical day is removed with, and a
    // fit on never corrected days is a failure that looks like a model.
    const capacityWattHours: number | undefined = this.batteryCapacityWattHours;
    if (capacityWattHours === undefined) {
      this.dropHistory('the energy manager reports no usable battery capacity');
      return;
    }
    // Read *before* the three reads below: the backfill fetches days in order to store them, so without a
    // persistence it spends quota for rows that have nowhere to land. The give-up runs on the history
    // interval, because dropping and reporting per pass would be a storm of its own.
    const source: iPersist | undefined = Persistence.dbo;
    if (source === undefined) {
      if (!this.historyReadThrottled()) {
        this._historyAttemptedAt = Utils.nowMS();
        this.dropHistory('there is no persistence layer to read the history from');
      }
      return;
    }
    this.refreshWeatherHistory(source);
    this.refreshTodayConsumption(source);
    if (this._historyLoadRunning || this.historyReadThrottled()) {
      return;
    }
    this._historyAttemptedAt = Utils.nowMS();
    this._historyLoadRunning = true;
    this.loadHistory(source, capacityWattHours)
      .catch((error) => {
        this.dropHistory(`reading the history failed: ${(error as Error).message}`);
      })
      .finally(() => {
        this._historyLoadRunning = false;
      });
  }

  private historyReadThrottled(): boolean {
    return this._historyAttemptedAt > 0 && Utils.nowMS() - this._historyAttemptedAt < HISTORY_RELOAD_INTERVAL_MS;
  }

  /**
   * How much the house consumed since midnight of the day of the given moment.
   * @param moment - The moment to count up to.
   * @returns The consumption in kWh, or undefined while no reading of the running day is present.
   */
  private consumedTodayKwh(moment: Date): number | undefined {
    return EnergyHistoryService.consumedWithin(
      this._consumptionToday ?? [],
      new Date(moment).setHours(0, 0, 0, 0),
      moment.getTime(),
    );
  }

  /**
   * The dials of the plant, read anew on each use: a manager whose settings are edited at runtime must not be
   * answered on the values of the moment of construction.
   * @returns The manager's settings through the fields this service reads, or undefined without a manager.
   */
  private get plantDials(): iPlantEnergyDials | undefined {
    return Devices.energymanager?.settings as unknown as iPlantEnergyDials | undefined;
  }

  /**
   * The usable capacity of the battery.
   * @returns The capacity in watt hours, or undefined while no energy manager reports a usable one - an
   * energy manager that does not know its battery is a missing input, not a battery of size zero.
   */
  private get batteryCapacityWattHours(): number | undefined {
    const capacity: number | undefined = this.plantDials?.batteryCapacityWattage;
    return capacity !== undefined && Number.isFinite(capacity) && capacity > 0 ? capacity : undefined;
  }

  // What each of the three means is stated once, on iPlantEnergyDials and on the manager's settings.
  private get minimumDayCoverage(): number {
    return this.plantDials?.historyMinimumDayCoverage ?? DEFAULT_MINIMUM_DAY_COVERAGE;
  }

  private get consumptionQuantile(): number {
    return this.plantDials?.historyConsumptionQuantile ?? DEFAULT_CONSUMPTION_QUANTILE;
  }

  private get minimumConsumptionDays(): number {
    return this.plantDials?.historyMinimumConsumptionDays ?? DEFAULT_MINIMUM_CONSUMPTION_DAYS;
  }

  private remainingSunHoursAt(moment: Date): number {
    const sunset: Date = TimeCallbackService.getSunsetForDate(moment);
    return Math.max(0, (sunset.getTime() - moment.getTime()) / HOUR_MS);
  }

  /**
   * The end of the window the next morning's low is looked for in: the next sunrise after the given moment
   * plus a buffer hour. Read through the same service the sunset of {@link remainingSunHoursAt} comes from -
   * the two bound one and the same window, and two libraries put their sunrise and their sunset minutes apart.
   * @param moment - The evaluation moment.
   * @returns The end of the window in milliseconds.
   */
  private morningLowWindowEnd(moment: Date): number {
    let sunrise: Date = TimeCallbackService.getSunriseForDate(moment);
    if (sunrise.getTime() <= moment.getTime()) {
      sunrise = TimeCallbackService.getSunriseForDate(new Date(moment.getTime() + DAY_MS));
    }
    return sunrise.getTime() + MORNING_LOW_BUFFER_MS;
  }

  /**
   * Adds up the consumption readings that fall into the given window.
   * @param samples - The readings to add up.
   * @param fromMs - The start of the window.
   * @param toMs - The end of the window.
   * @returns The consumed energy in kWh, or undefined while the window holds no reading at all - an absent
   * reading must not read as "nothing consumed".
   */
  private static consumedWithin(samples: iConsumptionWindowSample[], fromMs: number, toMs: number): number | undefined {
    let sum: number = 0;
    let found: boolean = false;
    for (const sample of samples) {
      const time: number = sample.date.getTime();
      if (time <= fromMs || time > toMs) {
        continue;
      }
      sum += sample.consumedKwh;
      found = true;
    }
    return found ? sum : undefined;
  }

  /**
   * Fills the gaps in the stored daily weather aggregates. Without them two of the four quantities of a
   * historical day are missing and the model side never gets a basis.
   *
   * The trap: this does **not** sequence a write before the read that follows it in {@link refresh} - the run
   * is started and not awaited, so the history read always sees the row of an earlier run. The running day's
   * aggregate is therefore up to one interval old and the model side stays silent for the first interval after
   * a start, both of which are the safe direction: a missing aggregate means no statement.
   * @param source - The persistence the fetched days are handed to; established by the caller.
   */
  private refreshWeatherHistory(source: iPersist): void {
    if (this._weatherBackfillRunning) {
      return;
    }
    if (
      this._weatherBackfillAttemptedAt > 0 &&
      Utils.nowMS() - this._weatherBackfillAttemptedAt < WEATHER_BACKFILL_INTERVAL_MS
    ) {
      return;
    }
    this._weatherBackfillAttemptedAt = Utils.nowMS();
    this._weatherBackfillRunning = true;
    WeatherHistoryBackfill.run(source, new Date(), this.options.windowDays)
      .then((handedOver: number) => {
        if (handedOver > 0) {
          // "handed to" rather than "backfilled": the backfill cannot see whether a row arrived, so a line
          // claiming a stored count would read as confirmation of something nobody checked. Frozen wording -
          // operators grep and alert on this exact text, "history gate" in a plant wide service included.
          this.log(
            LogLevel.Info,
            `Handed ${handedOver} daily weather aggregate(s) to the persistence for the history gate`,
          );
        }
      })
      .catch((error) => {
        this.log(LogLevel.Warn, `Backfilling the daily weather aggregates failed: ${(error as Error).message}`);
      })
      .finally(() => {
        this._weatherBackfillRunning = false;
      });
  }

  /**
   * Reads the consumption of the running day on its own, far more often than the window. Served from the
   * hourly window cache the running day would show systematically less than the historical samples it is
   * compared against, and the model would read that as a quiet day and lean towards suppressing; a single day
   * is cheap enough to repeat at the decision's pace.
   * @param source - The persistence to read from; established by the caller.
   */
  private refreshTodayConsumption(source: iPersist): void {
    if (this._consumptionTodayRunning) {
      return;
    }
    if (
      this._consumptionTodayAttemptedAt > 0 &&
      Utils.nowMS() - this._consumptionTodayAttemptedAt < CONSUMPTION_RELOAD_INTERVAL_MS
    ) {
      return;
    }
    this._consumptionTodayAttemptedAt = Utils.nowMS();
    this._consumptionTodayRunning = true;
    const now: Date = new Date();
    source
      .getEnergyConsumptionHistory(new Date(new Date(now).setHours(0, 0, 0, 0)), now)
      .then((readings: iConsumptionWindowSample[]) => {
        this._consumptionToday = readings;
      })
      .catch((error) => {
        this._consumptionToday = undefined;
        this.log(LogLevel.Warn, `Reading the consumption of the running day failed: ${(error as Error).message}`);
      })
      .finally(() => {
        this._consumptionTodayRunning = false;
      });
  }

  /**
   * Forgets everything that was read so far, so a lost data basis can never carry an old answer along.
   * @param reason - Why there is no data basis; logged once per change, not once per evaluation.
   */
  private dropHistory(reason: string): void {
    this._consumptionSamples = undefined;
    this._consumptionReadingsSeen = false;
    this._weatherToday = undefined;
    this._historyModel = undefined;
    // Dropped here too: this runs in front of the read that would otherwise clear it, so nothing else does.
    this._consumptionToday = undefined;
    if (this._historyIssue !== reason) {
      this._historyIssue = reason;
      // Frozen wording, same reason as the backfill line above: operators grep for this exact text.
      this.log(LogLevel.Info, `History gate has no data basis: ${reason}`);
    }
  }

  /**
   * The evaluation moments of the sliding window, oldest first: the same time of day as the reference on
   * each of the preceding days.
   * @param reference - The running evaluation moment.
   * @param windowDays - Length of the window in days.
   * @returns One moment per day of the window.
   */
  private static historyMoments(reference: Date, windowDays: number): Date[] {
    const moments: Date[] = [];
    for (let offset: number = windowDays; offset >= 1; offset--) {
      const moment: Date = new Date(reference);
      // Calendar arithmetic, not milliseconds: over a window of months there is always a daylight saving
      // change, and a day subtracted as milliseconds lands an hour off the running time of day beyond it.
      moment.setDate(moment.getDate() - offset);
      moments.push(moment);
    }
    return moments;
  }

  /**
   * The recorded state changes of one generator, with a rejected read confined to that one generator: one
   * unreachable generator must not cost the charge levels, the consumption windows and the weather of the
   * whole window as well - the same judgement per entry {@link EnergyHistoryUtils.correctForFossilGeneration}
   * makes.
   * @param source - The persistence to read from.
   * @param actuatorId - The generator whose state changes are asked for.
   * @param start - Start of the history window.
   * @param end - End of the history window.
   * @param failedReads - Collects the generators whose read was rejected, so the absent runtime that follows
   * is not reported a second time under its own heading.
   * @returns The recorded state changes, or an empty list when the read was rejected.
   */
  private readGeneratorHistory(
    source: iPersist,
    actuatorId: string,
    start: Date,
    end: Date,
    failedReads: Set<string>,
  ): Promise<iActuatorStateSample[]> {
    return source.getActuatorHistory(actuatorId, start, end).catch((error) => {
      failedReads.add(actuatorId);
      // Not throttled beyond the hourly read: a read that keeps failing is a fault, and a fault that stops
      // being said stops being fixed.
      this.log(
        LogLevel.Warn,
        `Reading the recorded state changes of generator '${actuatorId}' failed, so nothing is subtracted for ` +
          `it and the photovoltaic looks better than it was: ${(error as Error).message}`,
      );
      return [];
    });
  }

  /**
   * Names every generator of the plant the window holds no runtime for. Nothing is subtracted for such a
   * generator, so the day keeps a share the photovoltaic never produced, the bound comes out too optimistic
   * and the gate suppresses a start the house needed - the direction without a way back, and invisible to an
   * operator. Zero runtime cannot be told from a generator that truly stood still, so the line names how many
   * state changes were recorded at all instead of claiming it can.
   * @param generators - The generators of the plant.
   * @param statesByActuator - What each of them has recorded over the window.
   * @param failedReads - The generators whose read was rejected; their absent runtime is already explained.
   * @param start - Start of the history window.
   * @param end - End of the history window.
   */
  private reportGeneratorsWithoutRuntime(
    generators: iFossilGeneratorSource[],
    statesByActuator: Map<string, iActuatorStateSample[]>,
    failedReads: Set<string>,
    start: Date,
    end: Date,
  ): void {
    for (const generator of generators) {
      if (failedReads.has(generator.actuatorId)) {
        continue;
      }
      const samples: iActuatorStateSample[] = statesByActuator.get(generator.actuatorId) ?? [];
      if (EnergyHistoryUtils.onMillisecondsWithin(samples, start.getTime(), end.getTime()) > 0) {
        this._generatorsWithoutRuntime.delete(generator.actuatorId);
        continue;
      }
      if (this._generatorsWithoutRuntime.has(generator.actuatorId)) {
        continue;
      }
      this._generatorsWithoutRuntime.add(generator.actuatorId);
      this.log(
        LogLevel.Warn,
        `Generator '${generator.actuatorId}' has no runtime recorded over the ${this.options.windowDays} day ` +
          `history window (${samples.length} recorded state change(s)), so nothing is subtracted for it and the ` +
          'photovoltaic looks better than it was',
      );
    }
  }

  /**
   * Reads the sliding window from the persistence and turns it into one sample per historical day, each taken
   * at the same time of day as the running evaluation, and fits the weights from them. The consumption windows
   * are collected independently of the weather aggregates, because the model free bound has to carry from the
   * first day with or without a backfilled weather history.
   * @param source - The persistence to read from.
   * @param capacityWattHours - The battery capacity the generator share is converted into state of charge with.
   */
  private async loadHistory(source: iPersist, capacityWattHours: number): Promise<void> {
    const now: Date = new Date();
    // Ids to query with here, ratings to correct with further down - read separately, because a generator
    // constructed while this read is in flight makes the two lists legitimately differ, and because the rating
    // is editable at runtime and the correction describes the generator as it is configured now.
    const queriedIds: string[] = Devices.fossilGenerators.map((generator) => generator.actuatorId);
    const moments: Date[] = EnergyHistoryService.historyMoments(now, this.options.windowDays);
    const start: Date = moments[0] ?? now;
    // The weather aggregates are dated at local midnight while the evaluation moments carry the running time
    // of day, so an unwidened start would lie behind the oldest day's row and cost that day its feature row -
    // one day per window, every window. Only this read is widened; the timestamped ones would gain a partial
    // day in the sums they feed.
    const weatherStart: Date = new Date(new Date(start).setHours(0, 0, 0, 0));
    const failedGeneratorReads: Set<string> = new Set<string>();
    const [levels, generatorStates, weather, consumption] = await Promise.all([
      source.getBatteryLevelHistory(start, now),
      Promise.all(
        queriedIds.map((actuatorId) => this.readGeneratorHistory(source, actuatorId, start, now, failedGeneratorReads)),
      ),
      source.getWeatherDaySummaries(weatherStart, now),
      source.getEnergyConsumptionHistory(start, now),
    ]);
    // Keyed by actuator, not by position: a read takes long enough for the generator list to have been
    // edited meanwhile, and matching by index would then hand one generator another one's run times.
    const statesByActuator: Map<string, iActuatorStateSample[]> = new Map(
      queriedIds.map((actuatorId, index) => [actuatorId, generatorStates[index]]),
    );
    const generators: iFossilGeneratorSource[] = Devices.fossilGenerators;
    this.reportGeneratorsWithoutRuntime(generators, statesByActuator, failedGeneratorReads, start, now);

    // One sum per historical day over the same time of day window the running evaluation faces. A day whose
    // readings do not cover that window is dropped rather than patched: its sum would look like a frugal night
    // and make the bound too optimistic - the suppressing direction. Shortly after sunrise the horizon reaches
    // past a calendar day and the windows overlap, which is admissible: both really did contain the shared
    // stretch, while shortening the window would understate a night and suppress more.
    const consumptionWindows: iConsumptionWindowSample[] = EnergyHistoryUtils.windowConsumptionSums(
      consumption,
      now.getTime(),
      this.morningLowWindowEnd(now),
      CONSUMPTION_READING_INTERVAL_MS,
      this.minimumDayCoverage,
    );

    const samples: iEnergyHistorySample[] = [];
    // Iterating over the window rather than over what was answered is what makes the window a window and not
    // a request: a persistence that answers more generously than asked cannot widen the fit.
    for (const moment of moments) {
      const windowEnd: number = this.morningLowWindowEnd(moment);
      const rawDelta: number | undefined = EnergyHistoryUtils.deltaToNextMorningLow(
        levels,
        moment.getTime(),
        windowEnd,
      );
      if (rawDelta === undefined) {
        continue;
      }
      const day: iWeatherDaySummary | undefined = weather.find(
        (entry: iWeatherDaySummary) => entry.date.toDateString() === moment.toDateString(),
      );
      const consumedSoFarKwh: number | undefined = EnergyHistoryService.consumedWithin(
        consumption,
        new Date(moment).setHours(0, 0, 0, 0),
        moment.getTime(),
      );
      if (day === undefined || consumedSoFarKwh === undefined) {
        // Only the model side needs all four quantities; no substitute value is invented.
        continue;
      }
      // Counted to the end of the window rather than to the low point itself, and a generator added after the
      // read carries no runtime at all - both can only make the photovoltaic look worse, the harmless
      // direction.
      const runs: iFossilGeneratorRun[] = generators.map((generator) => ({
        runMilliseconds: EnergyHistoryUtils.onMillisecondsWithin(
          statesByActuator.get(generator.actuatorId) ?? [],
          moment.getTime(),
          windowEnd,
        ),
        ratedElectricalWattage: generator.ratedElectricalWattage,
        conversionFactor: generator.conversionFactor,
      }));
      samples.push({
        features: {
          remainingSunHours: this.remainingSunHoursAt(moment),
          cloudCover: day.cloudCover,
          consumedSoFarKwh,
          maxTemperature: day.tempMax,
        },
        observedDelta: EnergyHistoryUtils.correctForFossilGeneration(rawDelta, runs, capacityWattHours),
        date: moment,
      });
    }

    if (samples.length === 0 && consumptionWindows.length === 0) {
      this.dropHistory('the history window holds no usable day');
      return;
    }
    this._consumptionSamples = consumptionWindows;
    // Out of the same answer as the historical ones, so both sides of the model read one field of one table.
    this._weatherToday = weather.find((entry: iWeatherDaySummary) => entry.date.toDateString() === now.toDateString());
    // Kept apart from the window sums: "no readings at all" and "readings that no window could be formed from"
    // are different states and must read differently.
    this._consumptionReadingsSeen = consumption.length > 0;
    this._historyModel = EnergyHistoryUtils.fit(samples, this.options.minimumModelDays);
    this._historyIssue = undefined;
  }
}
