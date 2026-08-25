import {
  DachsDeviceSettings,
  EnergyHistoryUtils,
  EnergyManagerUtils,
  iEnergyHistoryModel,
  iPersist,
  LogLevel,
  Persistence,
  ServerLogService,
  SettingsService,
  TimeCallbackService,
  TimeOfDay,
  Utils,
  VictronDevice,
  VictronDeviceSettings,
  WeatherHistoryBackfill,
  WeatherResponse,
  WeatherService,
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

/** The shape of {@link VictronDeviceData} the device under test actually reads. */
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

// The consumer opens an mqtt connection in its constructor; the cases here are about what the device
// derives from the values, not about how they arrive.
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

/** A fixed daylight instant, 2026-06-21 09:00 UTC. */
const NOW_MS: number = 1782032400 * 1000;
/** 2026-06-21 17:00 UTC - exactly eight hours after {@link NOW_MS}. */
const SUNSET_MS: number = 1782061200 * 1000;
/** Production of the report cases, the only measurement the excess calculation reads. */
const PRODUCTION_WATTAGE: number = 4200;

/**
 * Builds a Victron device on the mocked mqtt consumer.
 * @returns The device under test
 */
function buildDevice(): VictronDevice {
  // The consumer is mocked away, so the options only have to satisfy the type.
  const options = { ip: null, port: 1883, influxDb: null, debug: false } as unknown as ConstructorParameters<
    typeof VictronDevice
  >[0];
  return new VictronDevice(options);
}

/**
 * How the situations below arm what the plant recorded: rows in a persistence, and a given model at the seam
 * a model enters the plant through. Nothing writes a window sum, a bound or a feature row - those are what the
 * plant calculates, and a case that assigns one checks the assignment instead of the arithmetic.
 */

/** How many days of recorded history the arrangements offer; well above every bar in play. */
const RECORDED_DAYS: number = 40;
/** The state of charge every situation below starts from, well below every rung of the hour ladder. */
const MORNING_SOC: number = 35;
/** The delivered reserve of the manager - all synthetic bounds below are placed relative to it. */
const RESERVE_PERCENT: number = 20;
/** The delivered capacity, so one kWh of expected consumption is worth ten percentage points. */
const CAPACITY_WATT_HOURS: number = 10000;
/**
 * Consumption windows placing the model free bound exactly on the reserve: 35 % - 1.5 kWh * 10 pt/kWh = 20 %.
 * Ten of them are needed before a quantile means anything, and an all-equal set has that value at every
 * quantile.
 */
const WINDOW_KWH_ON_THE_RESERVE: number = 1.5;
/** One hundredth of a kWh heavier, which puts the bound at 19.9 % - one hair below the reserve. */
const WINDOW_KWH_ONE_HAIR_BELOW: number = 1.51;
/** Clearly below the reserve at 19.0 %, so a case about the band is not carried by the model free rung. */
const WINDOW_KWH_BELOW_THE_RESERVE: number = 1.6;
/** Clearly above the reserve at 25.0 %. */
const WINDOW_KWH_ABOVE_THE_RESERVE: number = 1.0;

/** A given model, never a fit result, so no case here claims a weight. */
const MODEL: iEnergyHistoryModel = {
  weights: [2.0, -0.2, -1.5, -0.3],
  intercept: 4.0,
  residualSigma: 5.0,
  sampleDays: 24,
};
/**
 * The same given model with a more generous intercept, so the very same recorded day comes out on the other
 * side of the reserve: 24 + 16 - 17 - 15.6 - 5.4 = +2.0, edges -3.0 and +7.0, band 32.0 %..42.0 %.
 */
const MODEL_AMPLE: iEnergyHistoryModel = { ...MODEL, intercept: 24.0 };

interface FeatureSet {
  cloudCover: number;
  consumedSoFarKwh: number;
  maxTemperature: number;
}

/**
 * Under {@link MODEL} and the eight sun hours every case runs against: 4 + 16 - 17 - 15.6 - 5.4 = -18.0, so
 * the edges are -23.0 and -13.0 and the band lands at 12.0 %..22.0 % - eight points short of the reserve.
 */
const FEATURES_SHORT: FeatureSet = { cloudCover: 85, consumedSoFarKwh: 10.4, maxTemperature: 18.0 };
/** Likewise: 4 + 16 - 4 - 6 - 7.8 = +2.2, edges -2.8 and +7.2, band 32.2 %..42.2 % - the reserve holds. */
const FEATURES_AMPLE: FeatureSet = { cloudCover: 20, consumedSoFarKwh: 4.0, maxTemperature: 26.0 };

/** The reservation the model free rung and a holding band both produce. */
const NO_RESERVATION_EXCESS: number = PRODUCTION_WATTAGE - 600;
/** Eight points of 10000 Wh over eight hours are 100 W held back. */
const EIGHT_POINT_DEFICIT_EXCESS: number = PRODUCTION_WATTAGE - 100 - 600;
/** What the calculation without any history holds back: (1 - 0.35) * 10000 Wh / 8 h = 812.5 W. */
const NO_HISTORY_EXCESS: number = PRODUCTION_WATTAGE - 812.5 - 600;

/**
 * The operator's day: dull in the morning, clearing up towards a hot afternoon. Its **daily mean** cloud
 * cover is what the hour ladder reads, and at 55 % it never falls below the ladder's threshold of 40 - which
 * is precisely why the ladder's sunny morning branch cannot fire on the day it was built for.
 * @returns The forecast stand-in.
 */
function forecastDullMorningHotAfternoon(): WeatherResponse {
  return { daily: [{ clouds: 55, temp: { max: 31 } }] } as unknown as WeatherResponse;
}

/**
 * A forecast the ladder does read as a sunny morning, so a case can be measured against the most permissive
 * answer the ladder has.
 * @returns The forecast stand-in.
 */
function forecastSunnyMorning(): WeatherResponse {
  return { daily: [{ clouds: 20, temp: { max: 31 } }] } as unknown as WeatherResponse;
}

/**
 * Nails both ends of the horizon down to a fixed distance ahead of whatever moment is asked about, so a case
 * decides against an arranged sun rather than against the real one of the run.
 *
 * The sunset is the same eight hours the sunset mock of the existing cases gives, so the remaining sun hours
 * of a feature row and the horizon the reservation is spread over agree. The sunrise bounds the far end of the
 * morning low window, which is what makes a recorded night a fixed number of quarter hour readings and
 * therefore a window sum a case can state.
 * @param hours - How many hours of sun are left at any evaluation moment.
 */
function pinSun(hours: number): void {
  jest
    .spyOn(TimeCallbackService, 'getSunsetForDate')
    .mockImplementation((day: Date = new Date()): Date => new Date(day.getTime() + hours * HOUR_MS));
  // One hour less than the horizon, because the production path adds a buffer hour to the sunrise it finds.
  jest
    .spyOn(TimeCallbackService, 'getSunriseForDate')
    .mockImplementation(
      (day: Date = new Date()): Date => new Date(day.getTime() + (MORNING_LOW_HORIZON_HOURS - 1) * HOUR_MS),
    );
}

/**
 * States which model the plant has, at the seam a model enters it through.
 *
 * A given object rather than a fit result: asserting a fitted weight would be a guessed weight, only disguised
 * as a test. What is observed is what the manager does with the model, never the model itself.
 * @param model - The model the plant has, or undefined for a plant that could not fit one.
 */
function givenModel(model: iEnergyHistoryModel | undefined): void {
  jest.spyOn(EnergyHistoryUtils, 'fit').mockReturnValue(model);
}

/**
 * Puts what the plant recorded into a persistence: one quarter hour reading per interval of every recorded
 * day, and the stored daily weather aggregate of the running day.
 *
 * The window sum of a night follows from the readings and the pinned horizon rather than being written down,
 * which is why the reading is the asked window divided by the number of readings that fit into it.
 * @param windowKwh - What one recorded night consumes over the morning low window; undefined records nothing
 * at all, which is a database that answers and holds no usable day.
 * @param today - The weather and consumption of the running day; undefined is a day whose aggregate was never
 * stored, so no feature row can be formed.
 */
function arrangeRecorded(windowKwh: number | undefined, today: FeatureSet | undefined): void {
  if (windowKwh === undefined) {
    Persistence.dbo = plantPersistence({ days: 0, consumedTodayKwh: undefined, todayWeather: false });
    return;
  }
  const rows: PlantRowOptions = {
    days: RECORDED_DAYS,
    readingKwh: (): number => windowKwh / READINGS_PER_WINDOW,
    consumedTodayKwh: today?.consumedSoFarKwh,
    todayWeather: today !== undefined,
  };
  if (today !== undefined) {
    // Only the running day carries the quantities a case means; the recorded days keep varying weather of
    // their own, so the stored history is a history rather than one row repeated forty times.
    rows.cloudCover = (offset: number): number => (offset === 0 ? today.cloudCover : [10, 40, 70, 100][offset % 4]);
    rows.tempMax = (offset: number): number => (offset === 0 ? today.maxTemperature : [12, 18, 24, 30, 15][offset % 5]);
  }
  Persistence.dbo = plantPersistence(rows);
}

/**
 * One pass of the manager's own loop: it brings the plant's recorded history up to date and lets the reads
 * settle, so the next evaluation decides on what the plant recorded.
 *
 * The reads answer in microtasks, which is why this flushes those rather than advancing a timer: the wall
 * clock stays where the situation put it.
 * @param device - The manager whose loop is run.
 */
async function letThePlantRead(device: VictronDevice): Promise<void> {
  EnergyManagerUtils.refreshEnergyHistory(device);
  for (let flush: number = 0; flush < 12; flush++) {
    await Promise.resolve();
  }
}

/**
 * How far the throttles of the reading service have been moved on, without touching the wall clock the
 * recorded rows were built on - what a case means when it says "an hour later".
 */
let throttleOffset: number = 0;

/**
 * Counts the throttles of the reading service off a clock of their own.
 *
 * Time may be steered; a recorded row may not follow it, or the plant's history would end exactly where the
 * reading service is asking about.
 */
function pinThrottleClock(): void {
  throttleOffset = 0;
  jest.spyOn(Utils, 'nowMS').mockImplementation((): number => Date.now() + throttleOffset);
}

/**
 * Moves the throttles of the reading service forward.
 * @param ms - How far forward.
 */
function advanceThrottles(ms: number): void {
  throttleOffset += ms;
}

/**
 * Collects everything the manager writes, so a line can be read back verbatim.
 * @returns The recorder.
 */
function recordLogs(): string[] {
  const logs: string[] = [];
  jest.spyOn(ServerLogService, 'writeLog').mockImplementation((_l: LogLevel, message: string): void => {
    logs.push(message);
  });
  return logs;
}

describe('VictronDevice', () => {
  let device: VictronDevice;

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW_MS });
    mockVictronData.battery = { soc: 35, dcPower: 0 };
    mockVictronData.grid = { power: 0 };
    mockVictronData.pvInverter = { power: 0 };
    mockVictronData.system = { power: 0 };
    device = buildDevice();
  });

  afterEach(() => {
    device.dispose();
    // Emptied so a persistence one case recorded into is not the database of the next.
    Persistence.dbo = undefined;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('getReport', () => {
    beforeEach(() => {
      // Measurements of the report cases: production 4200 W, draw 0 W, injection 1800 W,
      // self consumption 2400 W, state of charge 64 %.
      mockVictronData.battery = { soc: 64, dcPower: 0 };
      mockVictronData.pvInverter = { power: PRODUCTION_WATTAGE };
      mockVictronData.grid = { power: -1800 };
      mockVictronData.system = { power: 2400 };
    });

    it('reports production, draw, injection, self consumption and state of charge, each on its own line', () => {
      const report: string = device.getReport();

      // The previous implementation returned the empty string, so a test on "not empty" alone would
      // already have been satisfied by a single character.
      expect(report).not.toBe('');
      expect(report).toContain('Production: 4200W');
      expect(report).toContain('Drawing Wattage: 0W');
      expect(report).toContain('Injecting Wattage: 1800W');
      expect(report).toContain('Self Consuming Wattage: 2400W');
      expect(report).toContain('Battery Level: 64%');
      // JsObjectEnergyManager.getReport joins with an empty string, which glues the values into one
      // unreadable line. That defect is not to be carried over, and `toContain` alone would not notice.
      expect(report.split('\n')).toHaveLength(5);
    });
  });

  // Characterisation, not a requirement: calculateExcessEnergy is out of scope for this project, but
  // it divides by hoursTilSunset, whose unit was corrected from minutes to hours. That moves the
  // battery reserve by a factor of 60. These cases hold on to what the calculation does NOW, so the
  // new magnitude is written down once and cannot shift again unnoticed.
  describe('excess energy after the sunset unit correction', () => {
    beforeEach(() => {
      // The sunset is a given of this situation, not a result to be verified here.
      jest.spyOn(TimeCallbackService, 'nextSunSet', 'get').mockReturnValue(new Date(SUNSET_MS));
      // Which part of the day it is comes from the sunrise/sunset bookkeeping of the time service.
      // That is likewise a given, not what is being characterised.
      jest.spyOn(TimeCallbackService, 'dayType').mockReturnValue(TimeOfDay.Daylight);
      mockVictronData.battery = { soc: 35, dcPower: 0 };
      mockVictronData.pvInverter = { power: PRODUCTION_WATTAGE };
      device.settings.batteryCapacityWattage = 10000;
      device.settings.normalBaseConsumptionWattage = 600;
    });

    it('reserves the power needed to refill the battery within the remaining hours', () => {
      // Eight hours really are eight, not 480 - this is the composition the sunset fix corrected.
      expect(TimeCallbackService.hoursTilSunset()).toBeCloseTo(8, 6);

      device.recalculatePowerSharing();

      // (1 - 0.35) * 10000 Wh / 8 h = 812.5 W held back for the battery, hence
      // 4200 W production - 812.5 W reserve - 600 W base load = 2787.5 W excess.
      // Before the correction the divisor was 480 minutes and reserved 13.54 W, which made the term
      // inert. The value below is what applies now.
      expect(device.excessEnergy).toBeCloseTo(2787.5, 6);
      // A state of charge of 35 % keeps the battery buffer branch out of it; had that branch run,
      // the result would be maximumBatteryDischargeWattage and would say nothing about the reserve.
      expect(device.excessEnergy).not.toBeCloseTo(device.settings.maximumBatteryDischargeWattage, 6);
    });
  });

  /**
   * The same division, at the end of the day it runs into. The remaining horizon is a raw difference against
   * the sun and reaches zero, while the part of day this branch is entered under is derived separately and
   * only turns at its own boundary - so the divisor is already worthless while the branch still runs. Every
   * five seconds, and after the minutes-to-hours correction sixty times as loudly as before.
   */
  describe('the reservation as the sun goes down', () => {
    /** (1 - 0.35) * 10000 Wh spread over the shortest horizon of half an hour = 13000 W held back. */
    const CLAMPED_RESERVATION: number = 13000;

    beforeEach(() => {
      jest.spyOn(TimeCallbackService, 'dayType').mockReturnValue(TimeOfDay.Daylight);
      mockVictronData.battery = { soc: MORNING_SOC, dcPower: 0 };
      mockVictronData.pvInverter = { power: PRODUCTION_WATTAGE };
      device.settings.batteryCapacityWattage = CAPACITY_WATT_HOURS;
      device.settings.normalBaseConsumptionWattage = 600;
    });

    it('stays finite when the sun sets in this very moment', () => {
      // The horizon at its shortest. Unclamped a tenth of an hour would already reserve 65 kW - a plant of
      // this size cannot charge at that rate - and zero hours make it -Infinity, which leaves the process
      // through toJSON.
      jest.spyOn(TimeCallbackService, 'nextSunSet', 'get').mockReturnValue(new Date(NOW_MS));
      expect(TimeCallbackService.hoursTilSunset()).toBe(0);

      device.recalculatePowerSharing();

      expect(Number.isFinite(device.excessEnergy)).toBe(true);
      expect(device.excessEnergy).toBeCloseTo(PRODUCTION_WATTAGE - CLAMPED_RESERVATION - 600, 6);
    });

    it('does not turn the reservation into a gift once the horizon is past', () => {
      // `dayType` measures against today's sunset plus its own offsets, `hoursTilSunset` against the next
      // one - two quantities that do not turn at the same instant. While they disagree the divisor is
      // negative, and a negative reservation is added to the excess instead of being held back.
      jest.spyOn(TimeCallbackService, 'nextSunSet', 'get').mockReturnValue(new Date(NOW_MS - 0.1 * HOUR_MS));
      expect(TimeCallbackService.hoursTilSunset()).toBeLessThan(0);

      device.recalculatePowerSharing();

      expect(device.excessEnergy).toBeLessThan(PRODUCTION_WATTAGE - 600);
      expect(device.excessEnergy).toBeCloseTo(PRODUCTION_WATTAGE - CLAMPED_RESERVATION - 600, 6);
    });
  });

  /**
   * The three rungs the battery reservation and the ac block are decided on, and the boundary between the
   * first two. Every number below is synthetic: a city coordinate, a given model and recorded consumption
   * readings, none of them measured at an installation.
   *
   * Every case builds an installation - rows in a persistence, a battery and dials on the manager, a stored
   * weather aggregate for the running day - lets the manager read them and then asks what it decides. Nothing
   * writes a window sum, a bound or a feature row: those are what the plant calculates. The one quantity
   * handed in rather than derived is the model, at the seam it enters the plant through.
   */
  describe('reservation and ac block on the recorded history', () => {
    beforeEach(() => {
      // Sun, part of day and coordinate are givens of these situations, not results to be verified here.
      jest.spyOn(TimeCallbackService, 'nextSunSet', 'get').mockReturnValue(new Date(SUNSET_MS));
      jest.spyOn(TimeCallbackService, 'dayType').mockReturnValue(TimeOfDay.Daylight);
      jest.spyOn(SettingsService, 'latitude', 'get').mockReturnValue(TEST_LATITUDE);
      jest.spyOn(SettingsService, 'longitude', 'get').mockReturnValue(TEST_LONGITUDE);
      // Recorded rather than executed: the backfill talks to a paid endpoint, and no case here is about it.
      jest.spyOn(WeatherHistoryBackfill, 'run').mockResolvedValue(0);
      pinSun(8);
      pinThrottleClock();
      mockVictronData.battery = { soc: MORNING_SOC, dcPower: 0 };
      mockVictronData.pvInverter = { power: PRODUCTION_WATTAGE };
      device.settings.batteryCapacityWattage = CAPACITY_WATT_HOURS;
      device.settings.normalBaseConsumptionWattage = 600;
      device.settings.minimumMorningSocReserve = RESERVE_PERCENT;
      // The day of the operator's report: its daily mean cloud cover is above the ladder's threshold.
      WeatherService.lastResponse = forecastDullMorningHotAfternoon();
    });

    afterEach(() => {
      WeatherService.lastResponse = undefined;
    });

    describe('rung 1 - the bound holds the reserve without any model', () => {
      // What the rung decides - no reservation and no ac block - is asserted at the tightest bound that still
      // reaches it, in "the boundary between rung 1 and rung 2" below. A model is recorded alongside there and
      // must not matter, because rung 1 decides before it is looked at.

      it('reports the release it decided on', async () => {
        givenModel(MODEL);
        arrangeRecorded(WINDOW_KWH_ABOVE_THE_RESERVE, FEATURES_SHORT);
        await letThePlantRead(device);
        const logs: string[] = recordLogs();

        device.recalculatePowerSharing();

        expect(logs.filter((m: string) => m.includes('Morning reserve decision: released:'))).toHaveLength(1);
      });
    });

    describe('rung 2 - the lower band edge is recorded, not acted on', () => {
      it('does not reserve although the lower edge misses the reserve', async () => {
        givenModel(MODEL);
        arrangeRecorded(WINDOW_KWH_BELOW_THE_RESERVE, FEATURES_SHORT);
        await letThePlantRead(device);
        // The rung really is reached, rather than the plant having nothing to say: the bound misses the
        // reserve, so rung 1 does not answer, and the band exists for rung 2 to have a verdict at all.
        expect(device.morningOutlook?.worstCaseLowSoc).toBeCloseTo(19.0, 6);
        expect(device.morningOutlook?.band?.lower).toBeCloseTo(12.0, 6);

        device.recalculatePowerSharing();

        // The old behaviour was the eight point deficit off the lower band edge; the edge no longer decides,
        // and both the reservation and the ac block fall back to what needs no history.
        expect(device.excessEnergy).toBeCloseTo(NO_HISTORY_EXCESS, 6);
        expect(device.excessEnergy).not.toBeCloseTo(EIGHT_POINT_DEFICIT_EXCESS, 6);
        expect(device.acBlocked).toBe(true);
      });

      it('does not release although the lower edge clears the reserve', async () => {
        // The counterpart of the case above: there the shadowed rung would have reserved, here it would have
        // released. Neither direction of a rung that rests on the fit may reach an actuator.
        givenModel(MODEL);
        arrangeRecorded(WINDOW_KWH_BELOW_THE_RESERVE, FEATURES_AMPLE);
        await letThePlantRead(device);
        // The band clears the reserve while the bound misses it, which is the situation this case is about.
        expect(device.morningOutlook?.worstCaseLowSoc).toBeCloseTo(19.0, 6);
        expect(device.morningOutlook?.band?.lower).toBeCloseTo(32.2, 6);

        device.recalculatePowerSharing();

        expect(device.excessEnergy).toBeCloseTo(NO_HISTORY_EXCESS, 6);
        expect(device.excessEnergy).not.toBeCloseTo(NO_RESERVATION_EXCESS, 6);
        expect(device.acBlocked).toBe(true);
      });

      it('leaves the most permissive answer of the hour ladder standing', async () => {
        // The ladder at its most permissive: a forecast-sunny hot morning, where it allows the air
        // conditioning at a state of charge of 35 % - and where the model rung would have blocked.
        WeatherService.lastResponse = forecastSunnyMorning();
        givenModel(MODEL);
        arrangeRecorded(WINDOW_KWH_BELOW_THE_RESERVE, FEATURES_SHORT);
        await letThePlantRead(device);
        // The band misses the reserve, so the model rung would have blocked - which is what makes the answer
        // below the ladder's and not an absence of any statement.
        expect(device.morningOutlook?.band?.lower).toBeCloseTo(12.0, 6);

        expect(device.acBlocked).toBe(false);
      });
    });

    describe('rung 3 - no statement, so the calculation that needs no history', () => {
      it('aims at a full battery by sunset and leaves the ac block to the hour ladder', async () => {
        // A database that is there and answers, and holds no usable day - a restore, a purge, an
        // installation on its first morning.
        givenModel(undefined);
        arrangeRecorded(undefined, undefined);
        await letThePlantRead(device);
        // Neither a bound nor a band: the plant really has nothing to say, so what answers is the ladder.
        expect(device.morningOutlook?.worstCaseLowSoc).toBeUndefined();
        expect(device.morningOutlook?.band).toBeUndefined();

        device.recalculatePowerSharing();

        expect(device.excessEnergy).toBeCloseTo(NO_HISTORY_EXCESS, 6);
        expect(device.acBlocked).toBe(true);
      });

      it('falls back although the bound misses the reserve, when there is no model to ask instead', async () => {
        // The bound exists and misses - which is not a statement about the morning, only the absence of the
        // model free release. Without a band the calculation without a history is what is left.
        givenModel(undefined);
        arrangeRecorded(WINDOW_KWH_BELOW_THE_RESERVE, FEATURES_SHORT);
        await letThePlantRead(device);
        expect(device.morningOutlook?.worstCaseLowSoc).toBeCloseTo(19.0, 6);
        expect(device.morningOutlook?.band).toBeUndefined();
        const logs: string[] = recordLogs();

        device.recalculatePowerSharing();

        expect(device.excessEnergy).toBeCloseTo(NO_HISTORY_EXCESS, 6);
        // And rung 2 reached no verdict, so the shadow has nothing to compare and stays silent.
        expect(logs.filter((m: string) => m.startsWith('Model shadow'))).toHaveLength(0);
      });
    });

    describe('the boundary between rung 1 and rung 2', () => {
      it('takes a bound exactly on the reserve as rung 1', async () => {
        givenModel(MODEL);
        arrangeRecorded(WINDOW_KWH_ON_THE_RESERVE, FEATURES_SHORT);
        await letThePlantRead(device);

        device.recalculatePowerSharing();

        expect(device.excessEnergy).toBeCloseTo(NO_RESERVATION_EXCESS, 6);
        expect(device.acBlocked).toBe(false);
      });

      it('takes a bound one hundredth of a kWh heavier as no release at all', async () => {
        // 1.51 kWh instead of 1.50 puts the bound at 19.9 % instead of 20.0 % - the only difference between
        // this case and the one above. Below the reserve nothing releases, and the model rung that used to
        // catch this case now only records it.
        givenModel(MODEL);
        arrangeRecorded(WINDOW_KWH_ONE_HAIR_BELOW, FEATURES_SHORT);
        await letThePlantRead(device);

        device.recalculatePowerSharing();

        expect(device.excessEnergy).toBeCloseTo(NO_HISTORY_EXCESS, 6);
        expect(device.acBlocked).toBe(true);
      });
    });
  });

  /**
   * The same split the fuel burning generator carries, on this manager's own rungs: rung 1 rests on measured
   * consumption alone and decides, rung 2 rests on the fitted model and only records what it would have
   * decided. The fit's window length has never been measured against real data, and a rung that may be worse
   * than a single comparison must not hold energy back.
   */
  describe('S - the model free rung decides, the model rung runs in the shadow', () => {
    beforeEach(() => {
      jest.spyOn(TimeCallbackService, 'nextSunSet', 'get').mockReturnValue(new Date(SUNSET_MS));
      jest.spyOn(TimeCallbackService, 'dayType').mockReturnValue(TimeOfDay.Daylight);
      jest.spyOn(SettingsService, 'latitude', 'get').mockReturnValue(TEST_LATITUDE);
      jest.spyOn(SettingsService, 'longitude', 'get').mockReturnValue(TEST_LONGITUDE);
      jest.spyOn(WeatherHistoryBackfill, 'run').mockResolvedValue(0);
      pinSun(8);
      pinThrottleClock();
      mockVictronData.battery = { soc: MORNING_SOC, dcPower: 0 };
      mockVictronData.pvInverter = { power: PRODUCTION_WATTAGE };
      device.settings.batteryCapacityWattage = CAPACITY_WATT_HOURS;
      device.settings.normalBaseConsumptionWattage = 600;
      device.settings.minimumMorningSocReserve = RESERVE_PERCENT;
      WeatherService.lastResponse = forecastDullMorningHotAfternoon();
    });

    afterEach(() => {
      WeatherService.lastResponse = undefined;
    });

    it('S3 - names the model verdict, the trivial rule and where the two agreed', async () => {
      givenModel(MODEL);
      arrangeRecorded(WINDOW_KWH_BELOW_THE_RESERVE, FEATURES_SHORT);
      await letThePlantRead(device);
      const logs: string[] = recordLogs();

      device.recalculatePowerSharing();

      const shadow: string[] = logs.filter((m: string) => m.startsWith('Model shadow'));
      // Pinned word for word, because this line is the whole deliverable: a human reads the week off it. The
      // subject names the plant's rung rather than this manager, since the record is the plant's one sample
      // and is written by whichever manager the installation runs.
      expect(shadow[0]).toBe(
        'Model shadow (energy manager model rung): the model says the coming morning misses, the trivial rule ' +
          'at 55% says it misses --> they agree; 1 agreed, 0 parted so far; soc 35%, lower band edge 12% ' +
          'against reserve 20% (soc 35%, 24 days)',
      );
    });

    it('S4 - keeps a running tally and writes only on a change of the pairing', async () => {
      // Fifty passes of the five second loop on the same pairing: at 35 % the trivial rule says the coming
      // morning misses, and under this model the band misses it too.
      givenModel(MODEL);
      arrangeRecorded(WINDOW_KWH_BELOW_THE_RESERVE, FEATURES_SHORT);
      await letThePlantRead(device);
      const logs: string[] = recordLogs();
      for (let pass: number = 0; pass < 50; pass++) {
        device.recalculatePowerSharing();
      }

      // The same recorded plant an hour later, now fitted to a model whose band clears the reserve: the
      // model says the morning holds while the trivial rule still says it misses, so the two part.
      givenModel(MODEL_AMPLE);
      advanceThrottles(2 * HOUR_MS);
      await letThePlantRead(device);
      device.recalculatePowerSharing();

      const shadow: string[] = logs.filter((m: string) => m.startsWith('Model shadow'));
      // Fifty lines over fifty passes would be the third silent repeat storm of this work.
      expect(shadow).toHaveLength(2);
      expect(shadow[1]).toContain('50 agreed, 1 parted so far');
    });
  });

  /**
   * The assurance of this change: an installation that has no recorded history behaves exactly as it did
   * before - and pays nothing for the possibility.
   */
  describe('without the recorded history', () => {
    beforeEach(() => {
      jest.spyOn(TimeCallbackService, 'nextSunSet', 'get').mockReturnValue(new Date(SUNSET_MS));
      jest.spyOn(TimeCallbackService, 'dayType').mockReturnValue(TimeOfDay.Daylight);
      pinSun(8);
      mockVictronData.battery = { soc: MORNING_SOC, dcPower: 0 };
      mockVictronData.pvInverter = { power: PRODUCTION_WATTAGE };
      device.settings.batteryCapacityWattage = CAPACITY_WATT_HOURS;
      device.settings.normalBaseConsumptionWattage = 600;
      WeatherService.lastResponse = forecastDullMorningHotAfternoon();
    });

    afterEach(() => {
      WeatherService.lastResponse = undefined;
    });

    it('reads nothing and writes no new line while the plant has no persistence', () => {
      // The assurance of this round, and the reason the switch could go: without data the manager reaches for
      // the persistence, finds none, and is then exactly the manager of before - same reservation, same
      // block, and not one line an operator did not see yesterday.
      jest.spyOn(Persistence, 'dbo', 'get').mockReturnValue(undefined);
      const logs: string[] = [];
      jest.spyOn(ServerLogService, 'writeLog').mockImplementation((_l: LogLevel, message: string): void => {
        logs.push(message);
      });

      for (let pass: number = 0; pass < 50; pass++) {
        device.recalculatePowerSharing();
        expect(device.excessEnergy).toBeCloseTo(NO_HISTORY_EXCESS, 6);
        expect(device.acBlocked).toBe(true);
      }

      expect(logs.filter((m: string) => m.includes('Morning reserve decision'))).toHaveLength(0);
      expect(logs.filter((m: string) => m.startsWith('Model shadow'))).toHaveLength(0);
      // One line names the missing basis, once - not once per pass.
      expect(logs.filter((m: string) => m.includes('no data basis'))).toHaveLength(1);
    });
  });

  /**
   * The evaluation runs every five seconds. What the history costs must not scale with that.
   */
  describe('the five second loop', () => {
    it('reads each source once and logs the decision once over fifty passes', async () => {
      jest.spyOn(TimeCallbackService, 'nextSunSet', 'get').mockReturnValue(new Date(SUNSET_MS));
      jest.spyOn(TimeCallbackService, 'dayType').mockReturnValue(TimeOfDay.Daylight);
      jest.spyOn(SettingsService, 'latitude', 'get').mockReturnValue(TEST_LATITUDE);
      jest.spyOn(SettingsService, 'longitude', 'get').mockReturnValue(TEST_LONGITUDE);
      pinSun(8);
      mockVictronData.battery = { soc: MORNING_SOC, dcPower: 0 };
      mockVictronData.pvInverter = { power: PRODUCTION_WATTAGE };
      const logs: string[] = [];
      jest.spyOn(ServerLogService, 'writeLog').mockImplementation((_l: LogLevel, message: string): void => {
        logs.push(message);
      });
      const source = {
        initialized: true,
        getBatteryLevelHistory: jest.fn().mockResolvedValue([]),
        getActuatorHistory: jest.fn().mockResolvedValue([]),
        getWeatherDaySummaries: jest.fn().mockResolvedValue([]),
        getEnergyConsumptionHistory: jest.fn().mockResolvedValue([]),
        persistWeatherDaySummary: jest.fn().mockResolvedValue(undefined),
        // Written by the battery bookkeeping the same interval callback does before the calculation.
        persistBatteryDevice: jest.fn(),
      };
      jest.spyOn(Persistence, 'dbo', 'get').mockReturnValue(source as unknown as iPersist);

      // Fifty passes are 250 simulated seconds - inside the five minute throttle of the running day's
      // consumption and far inside the hourly one of the window, so a second read would be a storm.
      for (let pass: number = 0; pass < 50; pass++) {
        jest.advanceTimersByTime(5 * 1000);
        // Flushed on purpose: an unresolved read would keep the in-flight guard closed, and the throttle
        // rather than that guard is what this case is about.
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      }

      expect(source.getBatteryLevelHistory).toHaveBeenCalledTimes(1);
      expect(source.getWeatherDaySummaries).toHaveBeenCalledTimes(1);
      // One for the sliding window and one for the running day - not one per pass.
      expect(source.getEnergyConsumptionHistory).toHaveBeenCalledTimes(2);
      // The stand-in answers empty, so there is no release to report and no band to record - what this case
      // pins is that fifty passes cost the reads of one, not that a decision was reached.
      expect(logs.filter((m: string) => m.includes('Morning reserve decision'))).toHaveLength(0);
      // A handful of lines over fifty passes; a per-pass line would be fifty.
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });
});

/**
 * The settings that carry a share rather than a count. `fromPartialObject` used to take every one of them
 * over raw, so 90 written for "90 percent" became a coverage of 9000 %, a quantile far outside the sample and
 * a conversion factor that invents energy - each of them silently, and each of them shifting what the
 * delivered numbers around it mean.
 *
 * The Dachs case sits in this file only because of how the work was split; it belongs next to the other
 * settings cases.
 */
describe('settings that carry a share between 0 and 1', () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    jest.spyOn(ServerLogService, 'writeLog').mockImplementation((_l: LogLevel, message: string): void => {
      logs.push(message);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('the energy manager', () => {
    it('keeps the delivered share and says so when a percentage is handed in', () => {
      const settings: VictronDeviceSettings = new VictronDeviceSettings();

      settings.fromPartialObject({ historyMinimumDayCoverage: 90, historyConsumptionQuantile: 90 });

      expect(settings.historyMinimumDayCoverage).toBe(0.9);
      expect(settings.historyConsumptionQuantile).toBe(0.9);
      // Each of them named in a line of its own, so the operator reads which dial was refused.
      expect(logs.filter((m: string) => m.includes('historyMinimumDayCoverage') && m.includes('90'))).toHaveLength(1);
      expect(logs.filter((m: string) => m.includes('historyConsumptionQuantile') && m.includes('90'))).toHaveLength(1);
    });

    it('takes a share inside its range over without a word', () => {
      // Without this the guard could refuse everything and still pass the two cases above.
      const settings: VictronDeviceSettings = new VictronDeviceSettings();

      settings.fromPartialObject({ historyMinimumDayCoverage: 0.75, historyConsumptionQuantile: 0 });

      expect(settings.historyMinimumDayCoverage).toBe(0.75);
      // Zero and one are inside the range, not outside it - a quantile of 0 is the smallest window sum.
      expect(settings.historyConsumptionQuantile).toBe(0);
      expect(logs).toHaveLength(0);
    });

    it('reports a window shorter than the evidence it demands', () => {
      // Not corrected: which of the two numbers the operator meant cannot be known from here, and the fit
      // simply never produces a band - which is the safe outcome. Only nobody would see why.
      const settings: VictronDeviceSettings = new VictronDeviceSettings();

      settings.fromPartialObject({ historyWindowDays: 10, historyMinimumDays: 15 });

      expect(settings.historyWindowDays).toBe(10);
      expect(settings.historyMinimumDays).toBe(15);
      expect(logs.filter((m: string) => m.includes('historyWindowDays'))).toHaveLength(1);
    });
  });

  describe('the combined heat and power unit', () => {
    it('keeps the delivered conversion factor and says so when a percentage is handed in', () => {
      const settings: DachsDeviceSettings = new DachsDeviceSettings();

      settings.fromPartialObject({ dachsConversionFactor: 80 });

      expect(settings.dachsConversionFactor).toBe(0.8);
      expect(logs.filter((m: string) => m.includes('dachsConversionFactor') && m.includes('80'))).toHaveLength(1);
    });

    it('takes a conversion factor inside its range over without a word', () => {
      const settings: DachsDeviceSettings = new DachsDeviceSettings();

      settings.fromPartialObject({ dachsConversionFactor: 0.65 });

      expect(settings.dachsConversionFactor).toBe(0.65);
      expect(logs).toHaveLength(0);
    });
  });
});
