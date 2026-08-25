import {
  ActuatorSetStateCommand,
  ActuatorWriteStateToDeviceCommand,
  Dachs,
  DeviceCapability,
  Devices,
  EnergyManagerUtils,
  HeatingMode,
  iActuator,
  iActuatorStateSample,
  iBaseDevice,
  iBatteryLevelSample,
  iConsumptionWindowSample,
  iEnergyHistoryOutlook,
  iEnergyManager,
  iMorningReserveVerdict,
  iPersist,
  iWeatherDaySummary,
  LogLevel,
  Persistence,
  ServerLogService,
  SettingsService,
  TimeCallbackService,
  TimeOfDay,
  Utils,
  WeatherHistoryBackfill,
  WeatherHourly,
  WeatherResponse,
  WeatherService,
} from '../../src';

/**
 * An installation built out of rows rather than out of assignments: a persistence carrying recorded charge
 * levels, consumption readings, daily weather aggregates and generator state changes, an energy manager
 * stating its battery and its dials, and a combined heat and power unit that asks the manager what the plant
 * says about the coming morning.
 *
 * Everything a case wants the plant to know it puts into these rows. Nothing here writes a calculated
 * quantity - no model, no window sum, no feature row - because a case that assigns a result checks the
 * assignment rather than the arithmetic that should have produced it.
 *
 * All numbers are synthetic decision cases; the coordinate is a city rather than an installation site.
 */

export const HOUR_MS: number = 60 * 60 * 1000;
export const QUARTER_HOUR_MS: number = 15 * 60 * 1000;
export const DAY_MS: number = 24 * HOUR_MS;
/** A city coordinate, deliberately not an installation site. */
export const TEST_LATITUDE: number = 52.03;
export const TEST_LONGITUDE: number = 8.53;
/** The battery the decision cases are calculated with. */
export const BATTERY_CAPACITY_WATT_HOURS: number = 67000;
/**
 * What an energy manager reports while its battery says nothing at all - see `victron-device.ts`, which
 * returns this instead of a level. It is a marker, not a low charge, and no arithmetic may treat it as one.
 */
export const NO_STATE_OF_CHARGE: number = -1;

/**
 * How far ahead of any evaluation moment the morning low window ends, in hours.
 *
 * The production path derives it from the sunrise that follows the moment plus a buffer hour, which no test
 * can steer otherwise; pinning the sunrise relative to the given moment keeps the horizon the same whether
 * the suite runs at noon or at dusk. Twelve hours are forty-eight quarter hour readings, which is what makes
 * the window sums below come out at round numbers.
 */
export const MORNING_LOW_HORIZON_HOURS: number = 12;
/** Quarter hour readings in one horizon. */
export const READINGS_PER_WINDOW: number = (MORNING_LOW_HORIZON_HOURS * HOUR_MS) / QUARTER_HOUR_MS;
/** What one quarter hour of a typical night consumes, so a whole window comes to {@link TYPICAL_WINDOW_KWH}. */
export const TYPICAL_READING_KWH: number = 0.25;
/** The window sum of a typical night: 12.0 kWh of 67 kWh are 17.91 charge points. */
export const TYPICAL_WINDOW_KWH: number = TYPICAL_READING_KWH * READINGS_PER_WINDOW;
/** A quieter night: 6.0 kWh are 8.96 charge points, so a reserve of 20 % is held from a charge level of 35 %. */
export const QUIET_READING_KWH: number = 0.125;

/** Above `warmWaterDesiredMinTemp` (45). */
export const WARM_WATER_OK: number = 52;
/** Below `warmWaterDesiredMinTemp` (45). */
export const WARM_WATER_COLD: number = 40;
/** Below `heatStorageMaxStartTemp` (70). */
export const HEAT_STORAGE_OK: number = 62;
/** Above `heatStorageMaxStartTemp` (70). */
export const HEAT_STORAGE_FULL: number = 72;
/** Below `winterMinimumHeatStorageTemp` (55). */
export const HEAT_STORAGE_COLD: number = 45;

/** Weather quantities no arranged situation ever means, so a read off the live forecast shows immediately. */
export const DAILY_CLOUD_COVER_NEVER_MEANT: number = 3;
export const DAILY_MAX_TEMPERATURE_NEVER_MEANT: number = 12;

/** The two numbers of the unit's contract settings. */
export const GENERATOR_RATED_WATTAGE: number = 5500;
export const GENERATOR_CONVERSION_FACTOR: number = 0.8;

/** One line the plant wrote. */
export interface LogEntry {
  /** The level it was written on */
  level: LogLevel;
  /** What it says */
  message: string;
}

/** One run of the daily weather backfill, recorded rather than executed. */
export interface BackfillRun {
  /** The day the window was measured back from */
  referenceDate: Date;
  /** How many days it was asked to fill */
  historyWindowDays: number;
}

/** One read the persistence was asked for. */
export interface QueryWindow {
  /** Which read it was */
  method: string;
  /** The device the read was about, for the reads that name one */
  id?: string;
  /** Start of the asked range */
  start: Date;
  /** End of the asked range */
  end: Date;
}

/** An actuator stand-in that records what it was asked to do instead of talking to hardware. */
export interface RecordingActuator {
  /** Everything it was asked to do */
  commands: ActuatorSetStateCommand[];
  /** The state it is in */
  actuatorOn: boolean;
  /** What a caller may find queued; never set by these cases */
  queuedValue: boolean | null;
  /**
   * Records one command.
   * @param c - What the device asked for.
   */
  setActuator(c: ActuatorSetStateCommand): void;
}

/**
 * Builds an actuator stand-in.
 * @param initiallyOn - The state the actuator starts out in.
 * @returns The recorder.
 */
export function recordingActuator(initiallyOn: boolean): RecordingActuator {
  return {
    commands: [],
    actuatorOn: initiallyOn,
    queuedValue: null,
    setActuator(c: ActuatorSetStateCommand): void {
      this.commands.push(c);
      this.actuatorOn = c.on;
    },
  };
}

/** What the plant recorded, day by day. */
export interface PlantRowOptions {
  /** How many days back rows exist; day 1 is yesterday. */
  days: number;
  /** What one quarter hour of the given historical day consumed, in kWh. */
  readingKwh?: (dayOffset: number) => number;
  /** The stored daily cloud cover of the given day. */
  cloudCover?: (dayOffset: number) => number;
  /** The stored daily maximum temperature of the given day. */
  tempMax?: (dayOffset: number) => number;
  /** What the running day consumed since midnight, or undefined for a day with no reading at all. */
  consumedTodayKwh?: number;
  /** Whether a daily weather aggregate is stored for the running day. */
  todayWeather?: boolean;
  /** Which generators have a recorded run over the window; every asked one when left out. */
  generatorsWithRuntime?: string[];
  /** Where the asked ranges are written to. */
  windows?: QueryWindow[];
}

/**
 * A persistence carrying what one plant recorded.
 *
 * It answers more generously than it was asked - the whole stored range for every read - the way a database
 * whose range filter cuts differently at the edge does. That is deliberate: whether the window lives in the
 * evaluation or only in the query is one of the things these cases are about.
 * @param options - What the plant recorded.
 * @returns The stand-in.
 */
export function plantPersistence(options: PlantRowOptions): iPersist {
  // The wall clock, deliberately not the one the throttles of the reading service are counted off: a case that
  // says "an hour later" moves the throttles, and rows that moved with them would still be rows of a plant
  // whose history stops at the moment the reading service is asking about.
  const now: number = Date.now();
  const readingKwh: (dayOffset: number) => number = options.readingKwh ?? ((): number => TYPICAL_READING_KWH);
  const cloudCover: (dayOffset: number) => number =
    options.cloudCover ?? ((day: number): number => [10, 40, 70, 100][day % 4]);
  const tempMax: (dayOffset: number) => number =
    options.tempMax ?? ((day: number): number => [12, 18, 24, 30, 15][day % 5]);

  const levels: iBatteryLevelSample[] = [];
  const consumption: iConsumptionWindowSample[] = [];
  const weather: iWeatherDaySummary[] = [];
  for (let day: number = options.days; day >= 0; day--) {
    const midnight: number = new Date(now - day * DAY_MS).setHours(0, 0, 0, 0);
    if (options.days > 0) {
      // A reading a minute past midnight, carrying nothing. It changes no window sum, and it is what keeps
      // "what has the day consumed so far" answerable at every moment - including the first quarter hour of
      // a day, where a grid that starts at 00:15 holds no reading yet.
      consumption.push({ consumedKwh: 0, date: new Date(midnight + 60 * 1000) });
    }
    for (let quarter: number = 1; quarter <= 96; quarter++) {
      // Dated at the END of the interval, the convention iPersist documents: one persisted row carries the
      // charge level and the consumption of one and the same quarter hour.
      const at: number = midnight + quarter * QUARTER_HOUR_MS;
      if (at > now) {
        break;
      }
      const hour: number = quarter / 4;
      levels.push({ level: hour < 5 ? 60 - 6 * hour : 30 + 3 * (hour - 5), date: new Date(at) });
      if (options.days > 0) {
        // The running day carries the same night as the older ones, so the occurrence of the window that
        // reaches into it is covered whatever hour the suite runs at. Without it the number of usable window
        // sums would be `days` before noon and one less after it, which is a count no case could state.
        consumption.push({ consumedKwh: readingKwh(day), date: new Date(at) });
      }
    }
    if (day > 0 || options.todayWeather !== false) {
      weather.push({
        date: new Date(midnight),
        cloudCover: cloudCover(day),
        tempMin: 8,
        tempMax: tempMax(day),
      });
    }
  }
  /**
   * What the running day consumed since midnight, answered as its own row.
   *
   * The one place the stand-in tells the two reads apart rather than serving both from one row set: the
   * window sums have to describe complete nights, so the running day carries the usual night above, while
   * "how far is this day along" is a quantity a case states outright instead of inheriting from the hour the
   * suite happens to run at.
   */
  const todayConsumption: iConsumptionWindowSample[] =
    options.consumedTodayKwh === undefined
      ? []
      : [{ consumedKwh: options.consumedTodayKwh, date: new Date(now - 60 * 1000) }];
  // A single switch-on at the very beginning and no closing entry, so every window carries run time
  // regardless of the wall clock the suite happens to start at.
  const running: iActuatorStateSample[] = [{ on: true, date: new Date(now - (options.days + 1) * DAY_MS) }];

  /**
   * Notes down which read was asked for which range.
   * @param method - The read that was asked.
   * @param start - The start of the asked range.
   * @param end - The end of the asked range.
   * @param id - The device the read was about, for the reads that name one.
   */
  function record(method: string, start: Date, end: Date, id?: string): void {
    options.windows?.push({ method, id, start, end });
  }

  return {
    initialized: true,
    getBatteryLevelHistory: (start: Date, end: Date): Promise<iBatteryLevelSample[]> => {
      record('levels', start, end);
      return Promise.resolve(levels);
    },
    getActuatorHistory: (id: string, start: Date, end: Date): Promise<iActuatorStateSample[]> => {
      record('actuator', start, end, id);
      const hasRuntime: boolean =
        options.generatorsWithRuntime === undefined || options.generatorsWithRuntime.includes(id);
      return Promise.resolve(hasRuntime ? running : []);
    },
    getWeatherDaySummaries: (start: Date, end: Date): Promise<iWeatherDaySummary[]> => {
      record('weather', start, end);
      return Promise.resolve(weather);
    },
    getEnergyConsumptionHistory: (start: Date, end: Date): Promise<iConsumptionWindowSample[]> => {
      // The running day is read through the same method, told apart by the range it asks for.
      const isRunningDay: boolean = end.getTime() - start.getTime() < DAY_MS;
      record(isRunningDay ? 'today' : 'consumption', start, end);
      if (!isRunningDay) {
        return Promise.resolve(consumption);
      }
      return Promise.resolve(
        todayConsumption.filter(
          (reading: iConsumptionWindowSample) =>
            reading.date.getTime() > start.getTime() && reading.date.getTime() <= end.getTime(),
        ),
      );
    },
  } as unknown as iPersist;
}

/**
 * The same stand-in, with one of its reads replaced.
 * @param source - The stand-in to change.
 * @param replacement - The reads to put in its place.
 * @returns The changed stand-in.
 */
export function withReads(source: iPersist, replacement: Partial<iPersist>): iPersist {
  return {
    ...(source as unknown as Record<string, unknown>),
    ...(replacement as unknown as Record<string, unknown>),
  } as unknown as iPersist;
}

/**
 * The same stand-in, but the daily weather aggregates are cut to the asked range the way the database does it
 * - `date >= start AND date <= end`, see `getWeatherDaySummaries` in postgreSqlPersist.ts.
 * @param source - The stand-in to cut the weather side of.
 * @returns The cutting stand-in.
 */
export function withRangeHonouringWeather(source: iPersist): iPersist {
  return withReads(source, {
    getWeatherDaySummaries: async (start: Date, end: Date): Promise<iWeatherDaySummary[]> => {
      const stored: iWeatherDaySummary[] = await source.getWeatherDaySummaries(start, end);
      return stored.filter(
        (summary: iWeatherDaySummary) =>
          summary.date.getTime() >= start.getTime() && summary.date.getTime() <= end.getTime(),
      );
    },
  } as unknown as Partial<iPersist>);
}

/**
 * The same stand-in, but one day of the consumption readings is thinned out to a handful, the way a database
 * gap or a restart leaves it.
 *
 * The span is measured from the evaluation moment rather than from midnight, because the window under
 * evaluation runs across midnight - thinning a calendar day would clip two windows instead of one.
 * @param source - The stand-in to thin a day out of.
 * @param dayOffset - Which day back from the evaluation moment to thin out.
 * @returns The thinned stand-in.
 */
export function withThinnedDay(source: iPersist, dayOffset: number): iPersist {
  const spanStart: number = Date.now() - dayOffset * DAY_MS;
  const spanEnd: number = spanStart + DAY_MS;
  return withReads(source, {
    getEnergyConsumptionHistory: async (start: Date, end: Date): Promise<iConsumptionWindowSample[]> => {
      const readings: iConsumptionWindowSample[] = await source.getEnergyConsumptionHistory(start, end);
      let seenInSpan: number = 0;
      return readings.filter((reading: iConsumptionWindowSample) => {
        const at: number = reading.date.getTime();
        if (at < spanStart || at >= spanEnd) {
          return true;
        }
        seenInSpan++;
        // Exactly one reading survives, and the second one rather than the first, so it is safely inside the
        // window and not a few milliseconds ahead of its start.
        return seenInSpan === 2;
      });
    },
  } as unknown as Partial<iPersist>);
}

/**
 * A live forecast whose every weather quantity differs from what any arrangement means.
 *
 * The features come out of the stored daily aggregate, and only out of there. The forecast is armed anyway so
 * that a fallback to it is visible rather than silently plausible: the daily cloud cover averages the night
 * hours in, the daily maximum is a forecast maximum, and neither is the quantity the weights were fitted on.
 * @returns The forecast stand-in.
 */
export function forecastNeverMeant(): WeatherResponse {
  const nowMs: number = Utils.nowMS();
  const hourly: WeatherHourly[] = [];
  for (let hour: number = 1; hour <= 24; hour++) {
    hourly.push({
      dt: Math.floor((nowMs + hour * HOUR_MS) / 1000),
      clouds: DAILY_CLOUD_COVER_NEVER_MEANT,
    } as unknown as WeatherHourly);
  }
  return {
    hourly,
    daily: [{ clouds: DAILY_CLOUD_COVER_NEVER_MEANT, temp: { max: DAILY_MAX_TEMPERATURE_NEVER_MEANT } }],
  } as unknown as WeatherResponse;
}

/**
 * An energy manager stand-in that carries the two things a manager owes the plant - a charge level and the
 * dials its history is read and judged with - and answers both the outlook and the verdict through the shared
 * implementation, exactly the way both real managers do.
 *
 * Deliberately not a stand-in for the outlook or the verdict itself: what a consumer is answered has to come
 * out of the same code an installation runs, otherwise these cases would pin a test double.
 * @param level - Where the current charge level is read from, so a case can move it after the fact.
 * @param settings - What the manager states; a dial left out is a manager that does not carry the field.
 * @returns The stand-in.
 */
export function testEnergyManager(level: () => number, settings: Record<string, number>): iEnergyManager {
  return {
    deviceCapabilities: [],
    settings,
    get batteryLevel(): number {
      return level();
    },
    log(logLevel: LogLevel, message: string): void {
      ServerLogService.writeLog(logLevel, message);
    },
    get morningOutlook(): iEnergyHistoryOutlook | undefined {
      return EnergyManagerUtils.morningOutlook(this as unknown as iEnergyManager);
    },
    get morningReserveVerdict(): iMorningReserveVerdict | undefined {
      const self: iEnergyManager = this as unknown as iEnergyManager;
      return EnergyManagerUtils.morningReserveVerdict(self, self.morningOutlook);
    },
  } as unknown as iEnergyManager;
}

/** The plant under test. */
export interface Plant {
  /** The combined heat and power unit that asks. */
  dachs: Dachs;
  /** The energy manager that owns the plant's reading of its history. */
  manager: iEnergyManager;
  /** The dials the plant states, so a case can move one without knowing which class carries it. */
  managerSettings: Record<string, number>;
  /** The start block of the unit. */
  blockDachsStart: RecordingActuator;
  /** What the unit was asked to do. */
  startCommands: ActuatorSetStateCommand[];
  /** Everything the plant wrote to the log. */
  logs: LogEntry[];
  /** The recorded runs of the daily weather backfill. */
  backfillRuns: BackfillRun[];
  /**
   * Moves the charge level the manager reports.
   * @param level - The level in percent.
   */
  setBatteryLevel(level: number): void;
  /**
   * Moves the two temperatures of the unit.
   * @param warmWater - The warm water temperature.
   * @param heatStorage - The heat storage temperature.
   */
  setTemperatures(warmWater: number, heatStorage: number): void;
  /**
   * Pins the sun the horizons are measured against.
   * @param remainingSunHours - How many hours of sun are left at any evaluation moment.
   * @param morningLowHorizonHours - How far ahead of any moment the morning low window ends.
   */
  pinSun(remainingSunHours: number, morningLowHorizonHours?: number): void;
  /** Drops everything recorded so far, so an assertion only sees what the arranged action caused. */
  resetRecordings(): void;
  /** One pass of the energy manager's own loop: it brings the plant's recorded history up to date. */
  refresh(): void;
  /** One full desired-state evaluation of the unit, the way a temperature update does it. */
  evaluate(): void;
  /** Lets the reads the manager started settle. */
  settle(): Promise<void>;
  /** One manager pass, settled, so the next evaluation decides on what the plant recorded. */
  load(): Promise<void>;
  /**
   * Moves the throttles of the reading service forward without touching the wall clock the rows were built
   * on - what a case means when it says "an hour later".
   * @param ms - How far forward.
   */
  advanceThrottles(ms: number): void;
}

/**
 * Builds a plant: an energy manager stating the battery and the dials, and a combined heat and power unit
 * that asks it. Nothing is read until {@link Plant.load} is called.
 * @param dials - Dials to state on the manager beyond the contract defaults; a dial set to undefined is a
 * manager that does not carry the field at all.
 * @returns The plant.
 */
export function plant(dials: Record<string, number | undefined> = {}): Plant {
  jest.useFakeTimers();
  const dachs: Dachs = new Dachs({
    roomName: 'TestRoom',
    refreshInterval: HOUR_MS,
    connectionOptions: { host: '127.0.0.1', port: 8080, username: 'test', password: 'test' },
  });
  jest.clearAllTimers();
  jest.useRealTimers();

  jest.spyOn(dachs, 'writeActuatorStateToDevice').mockImplementation((_c: ActuatorWriteStateToDeviceCommand): void => {
    // Deliberately empty - writing a state is where the device would reach for the network.
  });
  jest.spyOn(dachs.blockAutomationHandler, 'disableAutomatic').mockImplementation(() => undefined);

  const startCommands: ActuatorSetStateCommand[] = [];
  jest.spyOn(dachs, 'setActuator').mockImplementation((c: ActuatorSetStateCommand): void => {
    startCommands.push(c);
  });

  const blockDachsStart: RecordingActuator = recordingActuator(true);
  dachs.blockDachsStart = blockDachsStart as unknown as iActuator;

  // Steered explicitly: no branch under test may depend on the wall clock of the run.
  jest.spyOn(TimeCallbackService, 'dayType').mockReturnValue(TimeOfDay.Daylight);
  jest.spyOn(SettingsService, 'latitude', 'get').mockReturnValue(TEST_LATITUDE);
  jest.spyOn(SettingsService, 'longitude', 'get').mockReturnValue(TEST_LONGITUDE);

  const logs: LogEntry[] = [];
  jest.spyOn(ServerLogService, 'writeLog').mockImplementation((level: LogLevel, message: string): void => {
    logs.push({ level, message });
  });

  // Recorded rather than executed: the backfill talks to a paid endpoint, and the cases that care about it
  // assert on the recording.
  const backfillRuns: BackfillRun[] = [];
  jest
    .spyOn(WeatherHistoryBackfill, 'run')
    .mockImplementation((_persist, referenceDate: Date, historyWindowDays: number): Promise<number> => {
      backfillRuns.push({ referenceDate, historyWindowDays });
      return Promise.resolve(0);
    });

  // The throttles of the reading service are counted off this, and only off this - the rows the persistence
  // holds are built from the real clock. Moving the two apart is what lets a case say "an hour later".
  let throttleOffset: number = 0;
  jest.spyOn(Utils, 'nowMS').mockImplementation((): number => Date.now() + throttleOffset);

  // Armed with values no arrangement ever means: whoever reads the weather service instead of the stored
  // aggregate fails every case rather than only a dedicated one.
  WeatherService.lastResponse = forecastNeverMeant();

  let batteryLevel: number = 35;
  let heatStorageTemp: number = HEAT_STORAGE_OK;
  const settings: Record<string, number> = {
    batteryCapacityWattage: BATTERY_CAPACITY_WATT_HOURS,
    historyWindowDays: 90,
    historyMinimumDays: 15,
    historyBandSigma: 1.0,
    minimumMorningSocReserve: 20,
    noSunThresholdHours: 0.5,
  };
  for (const [field, value] of Object.entries(dials)) {
    if (value === undefined) {
      delete settings[field];
      continue;
    }
    settings[field] = value;
  }
  const manager: iEnergyManager = testEnergyManager((): number => batteryLevel, settings);
  Devices.energymanager = manager;

  /**
   * Pins both ends of the horizon to a fixed distance ahead of whatever moment is asked about.
   * @param remainingSunHours - How many hours of sun are left at any evaluation moment.
   * @param morningLowHorizonHours - How far ahead of any moment the morning low window ends.
   */
  function pinSun(remainingSunHours: number, morningLowHorizonHours: number = MORNING_LOW_HORIZON_HOURS): void {
    jest
      .spyOn(TimeCallbackService, 'getSunsetForDate')
      .mockImplementation((day: Date = new Date()): Date => new Date(day.getTime() + remainingSunHours * HOUR_MS));
    // One hour less than the horizon, because the production path adds a buffer hour to the sunrise it finds.
    jest
      .spyOn(TimeCallbackService, 'getSunriseForDate')
      .mockImplementation(
        (day: Date = new Date()): Date => new Date(day.getTime() + (morningLowHorizonHours - 1) * HOUR_MS),
      );
  }
  pinSun(11);

  SettingsService.settings.heaterSettings = { mode: HeatingMode.Summer };
  const internals: { _tempWarmWater: number; _tempHeatStorage: number } = dachs as unknown as {
    _tempWarmWater: number;
    _tempHeatStorage: number;
  };

  return {
    dachs,
    manager,
    managerSettings: settings,
    blockDachsStart,
    startCommands,
    logs,
    backfillRuns,
    setBatteryLevel(level: number): void {
      batteryLevel = level;
    },
    setTemperatures(warmWater: number, heatStorage: number): void {
      heatStorageTemp = heatStorage;
      internals._tempWarmWater = warmWater;
      internals._tempHeatStorage = heatStorage;
      dachs.warmWaterSensor.update(warmWater);
      dachs.heatStorageTempSensor.update(heatStorage);
    },
    pinSun,
    resetRecordings(): void {
      blockDachsStart.commands.length = 0;
      startCommands.length = 0;
      logs.length = 0;
    },
    refresh(): void {
      if (Devices.energymanager !== undefined) {
        EnergyManagerUtils.refreshEnergyHistory(Devices.energymanager);
      }
    },
    evaluate(): void {
      dachs.heatStorageTempSensor.update(heatStorageTemp);
    },
    settle(): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, 0));
    },
    async load(): Promise<void> {
      if (Devices.energymanager !== undefined) {
        EnergyManagerUtils.refreshEnergyHistory(Devices.energymanager);
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
    advanceThrottles(ms: number): void {
      throttleOffset += ms;
      // The two sensors of the unit distrust themselves after an hour without a reading, so a plant that is
      // an hour older is also a plant whose sensors have reported again in the meantime. Marking them as seen
      // rather than updating them keeps the jump free of the extra evaluations an update would trigger.
      dachs.warmWaterSensor.temperatureSensor.lastSeen = Utils.nowMS();
      dachs.heatStorageTempSensor.temperatureSensor.lastSeen = Utils.nowMS();
    },
  };
}

/**
 * Arranges summer operation with a warm enough water storage, which is the state the gate speaks in.
 * @param p - The plant to arrange.
 */
export function arrangeSummerOperation(p: Plant): void {
  SettingsService.settings.heaterSettings = { mode: HeatingMode.Summer };
  p.setTemperatures(WARM_WATER_OK, HEAT_STORAGE_OK);
  p.resetRecordings();
}

/**
 * Announces a synthetic fuel burning generator to the plant, exactly the way a generator device does when it
 * is constructed: it lands in the device list carrying {@link DeviceCapability.fossilGenerator}.
 *
 * Not a device stand-in beyond that - whoever reads the plant's generators reads the three fields of
 * `iFossilGeneratorSource` and nothing else, and a fuller stand-in would hide it if that stopped being true.
 * @param actuatorId - The id the state changes of this generator are recorded under.
 * @param ratedElectricalWattage - Its electrical rating in watt.
 * @param conversionFactor - The share of its energy that reached the battery.
 */
export function announceGenerator(
  actuatorId: string,
  ratedElectricalWattage: number = GENERATOR_RATED_WATTAGE,
  conversionFactor: number = GENERATOR_CONVERSION_FACTOR,
): void {
  Devices.alLDevices[actuatorId] = {
    id: actuatorId,
    actuatorId,
    ratedElectricalWattage,
    conversionFactor,
    deviceCapabilities: [DeviceCapability.fossilGenerator],
  } as unknown as iBaseDevice;
}

/**
 * Empties everything a plant leaves behind, so a unit of one case is not a generator of the next.
 */
export function tearDownPlant(): void {
  jest.restoreAllMocks();
  Devices.energymanager = undefined;
  Persistence.dbo = undefined;
  WeatherService.lastResponse = undefined;
  for (const key in Devices.alLDevices) {
    delete Devices.alLDevices[key];
  }
}
