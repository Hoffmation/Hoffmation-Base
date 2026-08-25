import {
  ActuatorSetStateCommand,
  ActuatorWriteStateToDeviceCommand,
  CommandSource,
  Dachs,
  DachsDeviceSettings,
  Devices,
  HeatingMode,
  iActuator,
  iEnergyManager,
  SettingsService,
  TimeCallbackService,
  TimeOfDay,
  Utils,
} from '../../src';

jest.mock('unifi-access', () => jest.fn()); // Working now, phew

Utils.testInitializeServices();

/**
 * Two decisions of the combined heat and power unit that are hard to observe from the outside: how long a
 * standing start block may stand before it is lifted regardless of the battery, and how warm the unit may
 * heat the water depending on the heating mode.
 *
 * All numbers below are synthetic decision cases; none of them are measured values of a real installation.
 */

/** Below `batteryLevelAllowStartThreshold` (50) - the block gets lifted here. */
const SOC_BELOW_ALLOW: number = 35;
/** Between `batteryLevelAllowStartThreshold` (50) and `batteryLevelPreventStartThreshold` (70). */
const SOC_MIDDLE_BAND: number = 60;
/** Above `warmWaterDesiredMinTemp` (45). */
const WARM_WATER_OK: number = 52;
/** Above the summer ceiling of 58, below the winter ceiling of 75. */
const WARM_WATER_ABOVE_SUMMER_LIMIT: number = 60;
/** Below both ceilings. */
const WARM_WATER_BELOW_SUMMER_LIMIT: number = 56;
/** Below `heatStorageMaxStartTemp` (70). */
const HEAT_STORAGE_OK: number = 62;
/**
 * Above `winterMinimumPreNightHeatStorageTemp` (65), which keeps the pre-night winter branch out of the
 * three hour cases regardless of the wall clock the suite happens to run at.
 */
const HEAT_STORAGE_WARM: number = 70;
const ONE_HOUR_MS: number = 60 * 60 * 1000;

interface RecordingActuator {
  commands: ActuatorSetStateCommand[];
  actuatorOn: boolean;
  queuedValue: boolean | null;
  setActuator(c: ActuatorSetStateCommand): void;
}

interface DachsInternals {
  _tempWarmWater: number;
  _tempHeatStorage: number;
  _blockStarted: number;
}

interface Harness {
  dachs: Dachs;
  blockDachsStart: RecordingActuator;
  setBatteryLevel(level: number): void;
  setTemperatures(warmWater: number, heatStorage: number): void;
  attachWarmWaterPump(initiallyOn: boolean): RecordingActuator;
  /** Drops everything recorded so far, so an assertion only sees what the arranged action caused. */
  resetRecordings(): void;
  /** Triggers one full desired-state evaluation the way a temperature update does in production. */
  evaluate(): void;
}

/**
 * An actuator stand-in that records what it was asked to do instead of talking to hardware.
 * @param initiallyOn - The state the actuator starts out in.
 * @returns The recorder.
 */
function recordingActuator(initiallyOn: boolean): RecordingActuator {
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

/**
 * Builds a Dachs that neither reaches the network nor leaves timers behind.
 *
 * The constructor arms a polling interval and the base device arms two timeouts; creating all of them
 * under fake timers and dropping those afterwards is what keeps the suite free of open handles.
 * @returns A fresh harness.
 */
function harness(): Harness {
  jest.useFakeTimers();
  const dachs: Dachs = new Dachs({
    roomName: 'TestRoom',
    refreshInterval: ONE_HOUR_MS,
    connectionOptions: { host: '127.0.0.1', port: 8080, username: 'test', password: 'test' },
  });
  jest.clearAllTimers();
  jest.useRealTimers();

  // Writing a state is where the device would reach for the network; none of these tests is about that.
  jest.spyOn(dachs, 'writeActuatorStateToDevice').mockImplementation((_c: ActuatorWriteStateToDeviceCommand): void => {
    // Deliberately empty.
  });
  // Starting the unit schedules a 15 minute automatic block whose timer would outlive the run.
  jest.spyOn(dachs.blockAutomationHandler, 'disableAutomatic').mockImplementation(() => undefined);

  const blockDachsStart: RecordingActuator = recordingActuator(false);
  dachs.blockDachsStart = blockDachsStart as unknown as iActuator;

  // Steered explicitly: the branch under test must not depend on the wall clock of the run.
  jest.spyOn(TimeCallbackService, 'dayType').mockReturnValue(TimeOfDay.Daylight);

  let batteryLevel: number = SOC_BELOW_ALLOW;
  let heatStorageTemp: number = HEAT_STORAGE_OK;
  Devices.energymanager = {
    deviceCapabilities: [],
    get batteryLevel(): number {
      return batteryLevel;
    },
  } as unknown as iEnergyManager;

  return {
    dachs,
    blockDachsStart,
    setBatteryLevel(level: number): void {
      batteryLevel = level;
    },
    setTemperatures(warmWater: number, heatStorage: number): void {
      heatStorageTemp = heatStorage;
      const internals: DachsInternals = dachs as unknown as DachsInternals;
      internals._tempWarmWater = warmWater;
      internals._tempHeatStorage = heatStorage;
      dachs.warmWaterSensor.update(warmWater);
      dachs.heatStorageTempSensor.update(heatStorage);
    },
    attachWarmWaterPump(initiallyOn: boolean): RecordingActuator {
      const pump: RecordingActuator = recordingActuator(initiallyOn);
      dachs.warmWaterPump = pump as unknown as iActuator;
      return pump;
    },
    resetRecordings(): void {
      blockDachsStart.commands.length = 0;
    },
    evaluate(): void {
      dachs.heatStorageTempSensor.update(heatStorageTemp);
    },
  };
}

/**
 * Arranges summer operation with an empty battery, which is the state in which the start block is lifted.
 * @param h - The harness to arrange.
 */
function arrangeSummerOperation(h: Harness): void {
  SettingsService.settings.heaterSettings = { mode: HeatingMode.Summer };
  h.setBatteryLevel(SOC_BELOW_ALLOW);
  h.setTemperatures(WARM_WATER_OK, HEAT_STORAGE_OK);
  // Arranging the temperatures already runs the stock path once; only what follows is under test.
  h.resetRecordings();
}

/**
 * Reads the outcome off the block actuator rather than off any internal flag.
 * @param h - The harness to look at.
 * @returns Whether the start block was lifted.
 */
function liftedBlock(h: Harness): boolean {
  return h.blockDachsStart.commands.some((c: ActuatorSetStateCommand) => !c.on);
}

describe('Dachs start block', () => {
  beforeEach(() => {
    SettingsService.settings.heaterSettings = { mode: HeatingMode.Summer };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Devices.energymanager = undefined;
  });

  describe('R2 - the three hour emergency lift', () => {
    /**
     * A standing start block in winter, with the battery in the band where neither the blocking nor the
     * lifting branch fires, so only the emergency lift is left to decide.
     * @param blockStandingForMs - How long the start block has been standing.
     * @returns The arranged harness.
     */
    function arrangeStandingBlock(blockStandingForMs: number): Harness {
      const h: Harness = harness();
      SettingsService.settings.heaterSettings = { mode: HeatingMode.Winter };
      h.setBatteryLevel(SOC_MIDDLE_BAND);
      h.setTemperatures(WARM_WATER_OK, HEAT_STORAGE_WARM);
      h.blockDachsStart.actuatorOn = true;
      h.resetRecordings();
      (h.dachs as unknown as DachsInternals)._blockStarted = Utils.nowMS() - blockStandingForMs;
      return h;
    }

    it('places the three hour threshold between 2h55 and 3h05', () => {
      const shortly: Harness = arrangeStandingBlock(2 * ONE_HOUR_MS + 55 * 60 * 1000);
      shortly.evaluate();
      // The stock comparison was against 180 * 60 * 60 ms, so it lifted after less than eleven minutes.
      expect(liftedBlock(shortly)).toBe(false);
      jest.restoreAllMocks();

      const past: Harness = arrangeStandingBlock(3 * ONE_HOUR_MS + 5 * 60 * 1000);
      past.evaluate();

      // Only the close pair pins the threshold to three hours rather than somewhere between eleven
      // minutes and four hours, and the lift names the threshold it applied.
      const lift: ActuatorSetStateCommand | undefined = past.blockDachsStart.commands.find(
        (c: ActuatorSetStateCommand) => !c.on,
      );
      expect(lift).toBeDefined();
      expect(lift?.reasonTrace).toContain('3 hours');
    });
  });

  describe('R12 - the warm water ceiling follows the season', () => {
    it('carries the summer ceiling through fromPartialObject', () => {
      const untouched: DachsDeviceSettings = new DachsDeviceSettings();
      untouched.fromPartialObject(JSON.parse('{}'));
      expect(untouched.summerWarmWaterDesiredMaxTemp).toBe(58);

      const configured: DachsDeviceSettings = new DachsDeviceSettings();
      configured.fromPartialObject(JSON.parse('{"summerWarmWaterDesiredMaxTemp":54}'));

      // A declared field whose assignment line was forgotten fails right here.
      expect(configured.summerWarmWaterDesiredMaxTemp).toBe(54);
    });

    it('does not keep the warm water pump running above the summer limit', () => {
      const h: Harness = harness();
      arrangeSummerOperation(h);
      h.setTemperatures(WARM_WATER_ABOVE_SUMMER_LIMIT, HEAT_STORAGE_WARM);
      const pump: RecordingActuator = h.attachWarmWaterPump(true);

      h.evaluate();

      const command: ActuatorSetStateCommand | undefined = pump.commands.at(-1);
      expect(command?.on).toBe(false);
      expect(command?.reasonTrace).toContain('higher than the desired max value of 58');
    });

    it('keeps the winter limit when heating mode is winter', () => {
      const h: Harness = harness();
      arrangeSummerOperation(h);
      SettingsService.settings.heaterSettings = { mode: HeatingMode.Winter };
      h.setTemperatures(WARM_WATER_ABOVE_SUMMER_LIMIT, HEAT_STORAGE_WARM);
      const pump: RecordingActuator = h.attachWarmWaterPump(true);

      h.evaluate();

      // Same temperature as the case above, only the heating mode differs: 60 is below the winter
      // ceiling of 75, so nothing switches the pump off here.
      expect(pump.commands.some((c: ActuatorSetStateCommand) => !c.on)).toBe(false);
      expect(pump.actuatorOn).toBe(true);
    });

    it('still heats below the summer limit', () => {
      const h: Harness = harness();
      arrangeSummerOperation(h);
      h.setTemperatures(WARM_WATER_BELOW_SUMMER_LIMIT, HEAT_STORAGE_WARM);
      h.blockDachsStart.actuatorOn = false;
      const pump: RecordingActuator = h.attachWarmWaterPump(false);

      h.evaluate();

      // Without this counter test an implementation that simply bars the pump all summer would pass.
      expect(pump.commands.some((c: ActuatorSetStateCommand) => c.on)).toBe(true);
    });

    it('does not start the warm water pump alongside the dachs above the summer limit', () => {
      const h: Harness = harness();
      arrangeSummerOperation(h);
      h.setTemperatures(WARM_WATER_ABOVE_SUMMER_LIMIT, HEAT_STORAGE_WARM);
      const pump: RecordingActuator = h.attachWarmWaterPump(false);

      h.dachs.setActuator(new ActuatorSetStateCommand(CommandSource.Force, true, 'test start'));

      // This is the second place the ceiling is read; an implementation that changed only the other one
      // would be green on the test above and wrong in operation.
      expect(pump.commands.some((c: ActuatorSetStateCommand) => c.on)).toBe(false);
    });

    it('does start the warm water pump alongside the dachs below the summer limit', () => {
      const h: Harness = harness();
      arrangeSummerOperation(h);
      h.setTemperatures(WARM_WATER_BELOW_SUMMER_LIMIT, HEAT_STORAGE_WARM);
      const pump: RecordingActuator = h.attachWarmWaterPump(false);

      h.dachs.setActuator(new ActuatorSetStateCommand(CommandSource.Force, true, 'test start'));

      expect(pump.commands.some((c: ActuatorSetStateCommand) => c.on)).toBe(true);
    });
  });
});
