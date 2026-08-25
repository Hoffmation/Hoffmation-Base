import {
  ActuatorSetStateCommand,
  ActuatorWriteStateToDeviceCommand,
  Dachs,
  Devices,
  EnergyHistoryUtils,
  HeatingMode,
  iActuatorStateSample,
  iBatteryLevelSample,
  iConsumptionWindowSample,
  iDachsHistoryGateResult,
  iEnergyHistoryModel,
  iEnergyHistoryOutlook,
  iPersist,
  iWeatherDaySummary,
  JsObjectEnergyManager,
  IoBrokerDeviceInfo,
  LogLevel,
  Persistence,
  ServerLogService,
  SettingsService,
  TimeCallbackService,
  TimeOfDay,
  EnergyManagerUtils,
  Utils,
  VictronDevice,
  WeatherHistoryBackfill,
} from '../../src';
import {
  HOUR_MS,
  MORNING_LOW_HORIZON_HOURS,
  PlantRowOptions,
  plantPersistence,
  READINGS_PER_WINDOW,
  TEST_LATITUDE,
  TEST_LONGITUDE,
} from '../support/plant-history';

/** The shape of the victron device data the manager under test actually reads. */
interface iMockVictronData {
  battery: { soc: number | null; dcPower: number | null };
  grid: { power: number | null };
  pvInverter: { power: number | null };
  system: { power: number | null };
}

const mockVictronData: iMockVictronData = {
  battery: { soc: null, dcPower: null },
  grid: { power: null },
  pvInverter: { power: null },
  system: { power: null },
};

jest.mock('unifi-access', () => jest.fn());

// The consumer opens an mqtt connection in its constructor; nothing here is about how the values arrive.
jest.mock('victron-mqtt-consumer', () => ({
  VictronMqttConsumer: jest.fn().mockImplementation(() => ({
    get data() {
      return mockVictronData;
    },
    disconnect: (): void => {
      // No connection was ever opened.
    },
    setGridSetPoint: (): void => {
      // Not part of these cases.
    },
  })),
}));

Utils.testInitializeServices();

/**
 * Who owns the reading of the plant's recorded history, and what a plant pays for it.
 *
 * The unit of these cases is the **plant**, not a device: an energy manager and a fuel burning generator
 * standing side by side, the way an installation runs them. That is the only arrangement in which "the paid
 * backfill happens once" and "the shadow keeps one sample" are statements at all - with a single device in the
 * picture, one instance and two instances look exactly alike.
 *
 * All numbers below are synthetic; the coordinate is a city rather than an installation site.
 */

/** How many days of recorded history the arrangements offer; well above every bar in play. */
const RECORDED_DAYS: number = 40;
/** The charge level every arrangement runs at, low enough that no hour rung releases on its own. */
const MORNING_SOC: number = 35;
/** The delivered capacity of the manager's settings, so one kWh is worth ten charge points. */
const CAPACITY_WATT_HOURS: number = 10000;
/** Above `warmWaterDesiredMinTemp` (45), so the unit's stage 1 does not answer instead. */
const WARM_WATER_OK: number = 52;
/** Below `heatStorageMaxStartTemp` (70). */
const HEAT_STORAGE_OK: number = 62;
/** Eight hours of sun, well above the unit's `noSunThresholdHours`. */
const SUN_HOURS: number = 8;

/** A given model, never a fit result, so no case here claims a weight. */
const MODEL: iEnergyHistoryModel = {
  weights: [2.0, -0.2, -1.5, -0.3],
  intercept: 4.0,
  residualSigma: 5.0,
  sampleDays: 24,
};

/**
 * Under {@link MODEL} at eight sun hours: 4 + 16 - 17 - 15.6 - 5.4 = -18.0, so the band lands at
 * 12.0 %..22.0 % - straddling the reserve of 20 %, which is what makes the manager's rung 2 reach a verdict.
 */
const FEATURES_SHORT = { cloudCover: 85, consumedSoFarKwh: 10.4, maxTemperature: 18.0 };
/**
 * A consumption window heavy enough that the model free bound misses the reserve: 35 % - 1.6 kWh * 10 pt/kWh
 * = 19 %. Without this the manager releases on rung 1 and never looks at the model at all.
 */
const WINDOW_KWH_BELOW_THE_RESERVE: number = 1.6;

interface LogEntry {
  level: LogLevel;
  message: string;
}

interface BackfillRun {
  windowDays: number;
}

interface DachsInternals {
  _tempWarmWater: number;
  _tempHeatStorage: number;
}

interface Plant {
  manager: VictronDevice;
  dachs: Dachs;
  logs: LogEntry[];
  backfillRuns: BackfillRun[];
  /** Runs one pass of the manager's five second loop, the way the interval does. */
  managerPass(): void;
  /** Runs one full desired-state evaluation of the unit, the way a temperature update does. */
  unitEvaluation(): void;
  /**
   * Puts what the plant recorded into a persistence: one quarter hour reading per interval of every recorded
   * day, and the stored daily weather aggregate of the running day. Nothing is read until {@link Plant.load}
   * is called.
   * @param windowKwh - What one recorded night consumes over the morning low window.
   * @param today - The weather and consumption of the running day.
   */
  record(windowKwh: number, today: typeof FEATURES_SHORT): void;
  /** One pass of the manager's own loop, settled, so the next decision runs on what the plant recorded. */
  load(): Promise<void>;
}

/**
 * An empty persistence that still counts as one: the reads answer nothing, but their presence is what lets
 * the history chain start at all.
 * @returns The stand-in.
 */
function emptyPersistence(): iPersist {
  return {
    initialized: true,
    getBatteryLevelHistory: (): Promise<iBatteryLevelSample[]> => Promise.resolve([]),
    getActuatorHistory: (): Promise<iActuatorStateSample[]> => Promise.resolve([]),
    getWeatherDaySummaries: (): Promise<iWeatherDaySummary[]> => Promise.resolve([]),
    getEnergyConsumptionHistory: (): Promise<iConsumptionWindowSample[]> => Promise.resolve([]),
    persistBatteryDevice: (): void => {
      // Written by the battery bookkeeping of the manager's own interval; not part of these cases.
    },
  } as unknown as iPersist;
}

/**
 * States which model the plant has, at the seam a model enters it through.
 *
 * A given object rather than a fit result: asserting a fitted weight would be a guessed weight, only disguised
 * as a test. What is observed is what the plant does with the model, never the model itself.
 * @param model - The model the plant has, or undefined for a plant that could not fit one.
 */
function givenModel(model: iEnergyHistoryModel | undefined): void {
  jest.spyOn(EnergyHistoryUtils, 'fit').mockReturnValue(model);
}

/**
 * Builds a plant: one energy manager and one fuel burning generator, in the order an installation constructs
 * them - the manager first, because the generator asks the plant for its battery while it is being built.
 * @returns The arranged plant.
 */
function plant(): Plant {
  jest.useFakeTimers();
  mockVictronData.battery = { soc: MORNING_SOC, dcPower: 0 };
  mockVictronData.grid = { power: 0 };
  mockVictronData.pvInverter = { power: 4200 };
  mockVictronData.system = { power: 0 };

  const logs: LogEntry[] = [];
  jest.spyOn(ServerLogService, 'writeLog').mockImplementation((level: LogLevel, message: string): void => {
    logs.push({ level, message });
  });

  // Recorded rather than executed: the backfill talks to a paid endpoint, and counting the calls is the
  // whole point of these cases.
  const backfillRuns: BackfillRun[] = [];
  jest
    .spyOn(WeatherHistoryBackfill, 'run')
    .mockImplementation((_persist, _referenceDate: Date, windowDays: number): Promise<number> => {
      backfillRuns.push({ windowDays });
      return Promise.resolve(0);
    });

  const options = { ip: null, port: 1883, influxDb: null, debug: false } as unknown as ConstructorParameters<
    typeof VictronDevice
  >[0];
  const manager: VictronDevice = new VictronDevice(options);
  manager.settings.batteryCapacityWattage = CAPACITY_WATT_HOURS;
  manager.settings.normalBaseConsumptionWattage = 600;

  const dachs: Dachs = new Dachs({
    roomName: 'TestRoom',
    refreshInterval: HOUR_MS,
    connectionOptions: { host: '127.0.0.1', port: 8080, username: 'test', password: 'test' },
  });
  jest.spyOn(dachs, 'writeActuatorStateToDevice').mockImplementation((_c: ActuatorWriteStateToDeviceCommand): void => {
    // Deliberately empty - writing a state is where the device would reach for the network.
  });
  jest.spyOn(dachs, 'setActuator').mockImplementation((_c: ActuatorSetStateCommand): void => {
    // Deliberately empty - what the unit is asked to do is not what these cases are about.
  });
  jest.spyOn(dachs.blockAutomationHandler, 'disableAutomatic').mockImplementation(() => undefined);

  // Steered explicitly: nothing here may depend on the wall clock of the run.
  jest.spyOn(TimeCallbackService, 'dayType').mockReturnValue(TimeOfDay.Daylight);
  jest.spyOn(TimeCallbackService, 'nextSunSet', 'get').mockReturnValue(new Date(Utils.nowMS() + SUN_HOURS * HOUR_MS));
  jest
    .spyOn(TimeCallbackService, 'getSunsetForDate')
    .mockImplementation((day: Date = new Date()): Date => new Date(day.getTime() + SUN_HOURS * HOUR_MS));
  // The far end of the morning low window, one hour less than the horizon because the production path adds a
  // buffer hour to the sunrise it finds. It is what makes a recorded night a fixed number of quarter hour
  // readings, and therefore a window sum a case can state.
  jest
    .spyOn(TimeCallbackService, 'getSunriseForDate')
    .mockImplementation(
      (day: Date = new Date()): Date => new Date(day.getTime() + (MORNING_LOW_HORIZON_HOURS - 1) * HOUR_MS),
    );
  jest.spyOn(SettingsService, 'latitude', 'get').mockReturnValue(TEST_LATITUDE);
  jest.spyOn(SettingsService, 'longitude', 'get').mockReturnValue(TEST_LONGITUDE);

  SettingsService.settings.heaterSettings = { mode: HeatingMode.Summer };
  const internals: DachsInternals = dachs as unknown as DachsInternals;
  internals._tempWarmWater = WARM_WATER_OK;
  internals._tempHeatStorage = HEAT_STORAGE_OK;
  dachs.warmWaterSensor.update(WARM_WATER_OK);

  return {
    manager,
    dachs,
    logs,
    backfillRuns,
    managerPass(): void {
      manager.recalculatePowerSharing();
    },
    unitEvaluation(): void {
      dachs.heatStorageTempSensor.update(HEAT_STORAGE_OK);
    },
    record(windowKwh: number, today: typeof FEATURES_SHORT): void {
      const rows: PlantRowOptions = {
        days: RECORDED_DAYS,
        // The window sum of a night follows from the readings and the pinned horizon rather than being
        // written down, which is why the reading is the asked window divided by the readings that fit in it.
        readingKwh: (): number => windowKwh / READINGS_PER_WINDOW,
        consumedTodayKwh: today.consumedSoFarKwh,
        // Only the running day carries the quantities a case means; the recorded days keep varying weather of
        // their own, so the stored history is a history rather than one row repeated forty times.
        cloudCover: (offset: number): number => (offset === 0 ? today.cloudCover : [10, 40, 70, 100][offset % 4]),
        tempMax: (offset: number): number => (offset === 0 ? today.maxTemperature : [12, 18, 24, 30, 15][offset % 5]),
      };
      Persistence.dbo = plantPersistence(rows);
    },
    async load(): Promise<void> {
      EnergyManagerUtils.refreshEnergyHistory(manager);
      // The reads answer in microtasks, so those are flushed rather than a timer advanced: the wall clock
      // stays where the recorded rows were built against.
      for (let flush: number = 0; flush < 12; flush++) {
        await Promise.resolve();
      }
    },
  };
}

/**
 * What the unit's last gate evaluation decided, read off the device's own dump.
 *
 * The dump rather than the private field, so this says nothing about where the unit keeps it.
 * @param p - The plant to look at.
 * @returns The decision, or undefined while the gate said nothing.
 */
function gateResultOf(p: Plant): iDachsHistoryGateResult | undefined {
  return (p.dachs.toJSON() as unknown as Record<string, iDachsHistoryGateResult | undefined>)['_historyGateResult'];
}

/**
 * The shadow lines of one run, by the stage that wrote them.
 * @param p - The plant to look at.
 * @returns One subject per written line, in the order they were written.
 */
function shadowSubjects(p: Plant): string[] {
  return p.logs
    .filter((entry: LogEntry) => entry.message.startsWith('Model shadow'))
    .map((entry: LogEntry) => entry.message.replace(/^Model shadow \(([^)]*)\).*$/s, '$1'));
}

describe('who owns the plant’s energy history', () => {
  afterEach(() => {
    Devices.energymanager = undefined;
    Persistence.dbo = undefined;
    for (const key in Devices.alLDevices) {
      delete Devices.alLDevices[key];
    }
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the plant holds exactly one reading of its history', () => {
    // A case reading which object holds the service was dropped here: it named where the service sits, and
    // where it sits is only visible from inside. What a second service would cost the plant is what the two
    // cases below count, and they carry the assurance without reaching into anything.

    it('pays the daily weather backfill once over a manager pass and five unit evaluations', async () => {
      const p: Plant = plant();
      Persistence.dbo = emptyPersistence();
      p.backfillRuns.length = 0;

      p.managerPass();
      for (let pass: number = 0; pass < 5; pass++) {
        p.unitEvaluation();
      }
      await Promise.resolve();

      // The backfill talks to a paid endpoint and throttles itself per instance, so a second instance is a
      // second bill for the same days - roughly forty-eight calls a day instead of twenty-four.
      expect(p.backfillRuns).toHaveLength(1);
      expect(p.backfillRuns[0].windowDays).toBe(90);
    });

    it('reads each source of the window once over a manager pass and five unit evaluations', async () => {
      const p: Plant = plant();
      const source = {
        initialized: true,
        getBatteryLevelHistory: jest.fn().mockResolvedValue([]),
        getActuatorHistory: jest.fn().mockResolvedValue([]),
        getWeatherDaySummaries: jest.fn().mockResolvedValue([]),
        getEnergyConsumptionHistory: jest.fn().mockResolvedValue([]),
        persistBatteryDevice: jest.fn(),
      };
      Persistence.dbo = source as unknown as iPersist;

      p.managerPass();
      await Promise.resolve();
      for (let pass: number = 0; pass < 5; pass++) {
        p.unitEvaluation();
      }
      await Promise.resolve();

      // Each read throttles itself per instance, so the duplication shows here as well: two instances read
      // the ninety day window twice inside the same hour.
      expect(source.getBatteryLevelHistory).toHaveBeenCalledTimes(1);
      expect(source.getWeatherDaySummaries).toHaveBeenCalledTimes(1);
      // One for the sliding window and one for the running day.
      expect(source.getEnergyConsumptionHistory).toHaveBeenCalledTimes(2);
    });
  });

  describe('the energy manager keeps the one shadow record', () => {
    it('records every verdict under one subject and one running tally', async () => {
      const p: Plant = plant();
      givenModel(MODEL);
      p.record(WINDOW_KWH_BELOW_THE_RESERVE, FEATURES_SHORT);
      await p.load();
      p.logs.length = 0;

      // Three passes of the manager's loop, each with a unit evaluation in between - the shape of a plant in
      // which both devices ask the same question about the same morning.
      for (let pass: number = 0; pass < 3; pass++) {
        p.managerPass();
        p.unitEvaluation();
      }

      // Two records would count these three situations as one and a half each: after a week the operator
      // reads two half samples against two thresholds, and the measurement the shadow exists for is gone.
      expect(new Set(shadowSubjects(p))).toEqual(new Set(['energy manager model rung']));
      const lines: LogEntry[] = p.logs.filter((entry: LogEntry) => entry.message.startsWith('Model shadow'));
      expect(lines).toHaveLength(1);
      expect(lines[0].message).toContain('1 agreed, 0 parted so far');
    });

    it('lets the unit reach the model band and still write nothing to any shadow', async () => {
      const p: Plant = plant();
      givenModel(MODEL);
      p.record(WINDOW_KWH_BELOW_THE_RESERVE, FEATURES_SHORT);
      await p.load();
      // A reserve of 25 % sits above the bound at 19 % and above the upper band edge at 22 %, so stage 2 does
      // not answer, sun is left so stage 3 does not either, and the model stage really is the one reached.
      p.manager.settings.minimumMorningSocReserve = 25;
      p.logs.length = 0;

      p.unitEvaluation();

      // The unit's model stage is reached - and it still contributes nothing, because the measurement of
      // whether the model beats the trivial rule is not the unit's.
      const result: iDachsHistoryGateResult | undefined = gateResultOf(p);
      expect(result?.reason).toContain('Stage 4');
      expect(result?.suppress).toBe(false);
      expect(result?.request).toBe(false);
      expect(shadowSubjects(p)).toEqual([]);
    });
  });

  // Which fields the two settings classes carry - the dials that moved off the consumer onto the manager, and
  // the hardware that stayed - is stated in `deviceSettings.test.ts`; the cases here run the plant instead.
  describe('how the history is read is stated once, by the energy manager', () => {
    it('lets the manager’s window reach the decision the consumer takes', async () => {
      const p: Plant = plant();
      Persistence.dbo = emptyPersistence();
      p.manager.settings.historyWindowDays = 30;
      p.backfillRuns.length = 0;

      p.unitEvaluation();
      p.managerPass();
      await Promise.resolve();

      // "The dial moved" is not the requirement, "the dial the consumer's decision runs against moved" is.
      expect(p.backfillRuns).toHaveLength(1);
      expect(p.backfillRuns[0].windowDays).toBe(30);
    });

    it('lets the manager’s band width move which stage the consumer lands on', async () => {
      const p: Plant = plant();
      givenModel(MODEL);
      p.record(WINDOW_KWH_BELOW_THE_RESERVE, FEATURES_SHORT);
      await p.load();

      p.unitEvaluation();
      expect(gateResultOf(p)?.reason).toContain('Stage 5');

      // A collapsed band leaves the point estimate at 17 %, below the unit's reserve of 20 % - the upper edge
      // now misses it, which is the other stage 4 branch.
      p.manager.settings.historyBandSigma = 0;
      p.unitEvaluation();

      const collapsed: iDachsHistoryGateResult | undefined = gateResultOf(p);
      expect(collapsed?.reason).toContain('Stage 4');
      expect(collapsed?.upperEdgeSoc).toBeCloseTo(17.0, 6);
    });
  });

  describe('the guard against a missing charge level lives in one place', () => {
    it('says nothing at all while the manager’s battery reports no level', async () => {
      const p: Plant = plant();
      givenModel(MODEL);
      p.record(WINDOW_KWH_BELOW_THE_RESERVE, FEATURES_SHORT);
      await p.load();
      mockVictronData.battery = { soc: null, dcPower: 0 };

      const outlook: iEnergyHistoryOutlook | undefined = p.manager.morningOutlook;
      p.unitEvaluation();

      // The marker of `batteryLevel` is minus one. Run through the projection it moves the whole band, and on
      // a clear morning that band still clears the reserve - so a consumer would be answered at exactly the
      // charge level at which it must not be. Told apart here, once, rather than in every consumer.
      expect(outlook).toBeUndefined();
      expect(gateResultOf(p)).toBeUndefined();
    });

    it('starts every projection from the level the manager itself reads', async () => {
      const p: Plant = plant();
      givenModel(MODEL);
      p.record(WINDOW_KWH_BELOW_THE_RESERVE, FEATURES_SHORT);
      await p.load();
      mockVictronData.battery = { soc: 41, dcPower: 0 };

      p.unitEvaluation();

      // The consumer quotes the level the projections were built on rather than one it read for itself; the
      // two are the same plant's battery and must never be quoted as two numbers.
      expect(p.manager.morningOutlook?.currentSoc).toBe(41);
      expect(gateResultOf(p)?.currentSoc).toBe(41);
    });
  });

  describe('a plant without this manager', () => {
    it('runs the consumer without any energy manager at all', () => {
      const p: Plant = plant();
      Devices.energymanager = undefined;

      expect(() => p.unitEvaluation()).not.toThrow();

      // Installations run without either manager. Such a plant has no battery to project from, which is the
      // state it was in before any of this existed. Read off the public dump rather than off a private field.
      expect(gateResultOf(p)).toBeUndefined();
    });

    it('runs the js object manager and gets no statement out of it, without a stub anywhere', () => {
      const p: Plant = plant();
      const source = {
        initialized: true,
        getBatteryLevelHistory: jest.fn().mockResolvedValue([]),
        getActuatorHistory: jest.fn().mockResolvedValue([]),
        getWeatherDaySummaries: jest.fn().mockResolvedValue([]),
        getEnergyConsumptionHistory: jest.fn().mockResolvedValue([]),
        persistBatteryDevice: jest.fn(),
      };
      Persistence.dbo = source as unknown as iPersist;
      // Built the way `Devices.createEnergyManager` builds it, key included - a manager without one cannot
      // even name itself in a log line.
      const info: IoBrokerDeviceInfo = IoBrokerDeviceInfo.byStateJsSplit({
        _id: 'javascript.0.00_EnergyManager_TestRoom',
        type: 'device',
        common: { name: '00-EnergyManager-TestRoom-1' },
      } as unknown as ConstructorParameters<typeof IoBrokerDeviceInfo>[0]);
      info.allDevicesKey = 'test-js-energy-manager';
      const jsManager: JsObjectEnergyManager = new JsObjectEnergyManager(info);
      Devices.energymanager = jsManager;

      try {
        // Checked rather than assumed: neither the field the conversion between kWh and charge points needs
        // nor the dials a history is read with are on this manager's settings, and there is no charge level
        // either. Its answer follows from that, and not from a branch written for it.
        expect((jsManager.settings as unknown as Record<string, unknown>).batteryCapacityWattage).toBeUndefined();
        expect((jsManager.settings as unknown as Record<string, unknown>).historyWindowDays).toBeUndefined();
        expect((jsManager as unknown as Record<string, unknown>).batteryLevel).toBeUndefined();

        // Really run, not only asked: its own five second loop, the reading it drives and the consumer that
        // asks it - the whole path a plant on this manager takes.
        p.backfillRuns.length = 0;
        jest.advanceTimersByTime(15 * 1000);
        p.unitEvaluation();

        expect(jsManager.morningOutlook).toBeUndefined();
        expect(gateResultOf(p)).toBeUndefined();
        // And it pays nothing for the statement it cannot make - no window read and no fetched day.
        expect(source.getBatteryLevelHistory).not.toHaveBeenCalled();
        expect(p.backfillRuns).toHaveLength(0);
      } finally {
        jsManager.dispose();
      }
    });
  });
});
