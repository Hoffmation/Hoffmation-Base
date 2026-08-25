import {
  ActuatorSetStateCommand,
  Devices,
  EnergyHistoryService,
  EnergyHistoryUtils,
  EnergyManagerUtils,
  HeatingMode,
  iActuator,
  iDachsHistoryGateResult,
  iEnergyHistoryBasis,
  iEnergyHistoryModel,
  iEnergyHistoryOutlook,
  iEnergyManager,
  iMorningReserveVerdict,
  LogLevel,
  Persistence,
  SettingsService,
  TimeCallbackService,
  TimeOfDay,
  Utils,
} from '../../src';
import {
  arrangeSummerOperation,
  HEAT_STORAGE_COLD,
  HEAT_STORAGE_FULL,
  HEAT_STORAGE_OK,
  HOUR_MS,
  LogEntry,
  NO_STATE_OF_CHARGE,
  Plant,
  plant,
  PlantRowOptions,
  plantPersistence,
  QUIET_READING_KWH,
  recordingActuator,
  RecordingActuator,
  tearDownPlant,
  WARM_WATER_COLD,
  WARM_WATER_OK,
} from '../support/plant-history';

jest.mock('unifi-access', () => jest.fn());

Utils.testInitializeServices();

/**
 * The history based start gate of the combined heat and power unit: whether it suppresses or asks for an
 * electricity driven start, in which order its five stages decide, and where in the control flow it sits.
 *
 * **The policy is the unit's, the facts are the plant's.** Every case below builds an installation - rows in
 * the persistence, a battery and dials on the energy manager, a stored weather aggregate for the running day -
 * and then asks the unit what it decides. Nothing writes a window sum, a bound or a feature row: those are
 * what the plant calculates, and a case that assigns one checks the assignment instead of the arithmetic.
 *
 * The one quantity handed in rather than derived is the **model**. A fitted weight may not be asserted (R7),
 * so a given model object is the input - injected at the seam it enters the plant through, which is
 * {@link EnergyHistoryUtils.fit}. What the plant does with it is then observed, never arranged.
 *
 * All numbers below are synthetic decision cases; none of them are measured values of a real installation,
 * and the coordinate is a city rather than an installation site.
 */

/** How many days of recorded history the arrangements offer; well above every bar in play. */
const OFFERED_DAYS: number = 40;

/** D-MODEL-A - a given model, never a fit result, so no case claims a weight (R7). */
const D_MODEL_A: iEnergyHistoryModel = {
  weights: [2.5, -0.1, -0.8, -0.3],
  intercept: 2.0,
  residualSigma: 4.0,
  sampleDays: 20,
};

/** The four quantities of the running day, as an installation would have recorded them. */
interface RunningDay {
  /** Hours of sun left at the evaluation moment */
  remainingSunHours: number;
  /** The stored daily cloud cover of the running day */
  cloudCover: number;
  /** What the house consumed since midnight, in kWh */
  consumedSoFarKwh: number;
  /** The stored daily maximum temperature of the running day */
  maxTemperature: number;
}

/** Running days of testdaten.md section 8; the delta each produces under D-MODEL-A is noted. */
const D_FEAT_CLEARMORN: RunningDay = {
  remainingSunHours: 14.0,
  cloudCover: 10,
  consumedSoFarKwh: 3.0,
  maxTemperature: 24.0,
}; // +26.4
const D_FEAT_BASE: RunningDay = {
  remainingSunHours: 11.0,
  cloudCover: 10,
  consumedSoFarKwh: 6.0,
  maxTemperature: 26.0,
}; // +15.9
const D_FEAT_2000: RunningDay = {
  remainingSunHours: 0,
  cloudCover: 95,
  consumedSoFarKwh: 12.0,
  maxTemperature: 17.0,
}; // -22.2
const D_FEAT_B8: RunningDay = {
  remainingSunHours: 9.0,
  cloudCover: 80,
  consumedSoFarKwh: 26.0,
  maxTemperature: 23.0,
}; // -11.2
const D_FEAT_DULLMORN: RunningDay = {
  remainingSunHours: 10.0,
  cloudCover: 90,
  consumedSoFarKwh: 8.0,
  maxTemperature: 19.0,
}; // +5.9
const D_FEAT_2M: RunningDay = {
  remainingSunHours: 1.5,
  cloudCover: 95,
  consumedSoFarKwh: 12.0,
  maxTemperature: 17.0,
}; // -18.45
/**
 * D-GATE-11a asks for a model lower edge at a projected 15.0 % while the bound sits at 17.09 %. The feature
 * row is not given in the test data, so it is derived from D-FEAT-B8 by raising the consumption until
 * D-MODEL-A yields -16.0: 2.0 + 22.5 - 8.0 - 25.6 - 6.9. Edges then land at -20.0 / -12.0.
 */
const D_FEAT_11A: RunningDay = {
  remainingSunHours: 9.0,
  cloudCover: 80,
  consumedSoFarKwh: 32.0,
  maxTemperature: 23.0,
};

/**
 * Puts the running day into the plant's rows and pins the sun it is measured against.
 *
 * The historical days keep varying weather of their own, so the stored history is a history rather than a row
 * repeated forty times; only the running day carries the quantities a case means.
 * @param p - The plant to arrange.
 * @param day - The four quantities of the running day.
 * @param rows - What else the plant recorded, where a case differs from the usual night.
 */
function arrangeRunningDay(p: Plant, day: RunningDay, rows: Partial<PlantRowOptions> = {}): void {
  p.pinSun(day.remainingSunHours);
  Persistence.dbo = plantPersistence({
    days: OFFERED_DAYS,
    consumedTodayKwh: day.consumedSoFarKwh,
    cloudCover: (offset: number): number => (offset === 0 ? day.cloudCover : [10, 40, 70, 100][offset % 4]),
    tempMax: (offset: number): number => (offset === 0 ? day.maxTemperature : [12, 18, 24, 30, 15][offset % 5]),
    ...rows,
  });
}

/**
 * States which model the plant has, at the seam a model enters it through.
 *
 * A given object rather than a fit result: asserting a fitted weight would be the guessed weight R7 forbids,
 * only disguised as a test. What is observed is what the unit does with the model, never the model itself.
 * @param model - The model the plant has, or undefined for a plant that could not fit one.
 */
function givenModel(model: iEnergyHistoryModel | undefined): void {
  jest.spyOn(EnergyHistoryUtils, 'fit').mockReturnValue(model);
}

/**
 * Reads the decision the gate stored in its last evaluation, off the device's own dump.
 * @param p - The plant to look at.
 * @returns The decision of the last evaluation.
 */
function decision(p: Plant): iDachsHistoryGateResult | undefined {
  return (p.dachs.toJSON() as unknown as Record<string, iDachsHistoryGateResult | undefined>)['_historyGateResult'];
}

/**
 * Reads the outcome off the block actuator rather than off any internal flag.
 * @param p - The plant to look at.
 * @returns Whether the start block was lifted.
 */
function liftedBlock(p: Plant): boolean {
  return p.blockDachsStart.commands.some((c: ActuatorSetStateCommand) => !c.on);
}

/**
 * Reads the start off the recorded actuator commands rather than off any internal flag.
 * @param p - The plant to look at.
 * @returns Whether the unit was asked to start.
 */
function started(p: Plant): boolean {
  return p.startCommands.some((c: ActuatorSetStateCommand) => c.on);
}

/**
 * The gate lines of one run.
 * @param p - The plant to look at.
 * @returns One entry per written line, in the order they were written.
 */
function gateLines(p: Plant): LogEntry[] {
  return p.logs.filter((entry: LogEntry) => entry.message.startsWith('History gate:'));
}

/**
 * How often the gate could say anything, read off the tally the operator reads it by.
 *
 * Parsed from the line rather than from a counter, and reported as a pair so a case can measure the
 * difference two evaluations make instead of the absolute count an arrangement already ran up.
 * @param p - The plant to look at.
 * @returns Statements and evaluations of the last written line, or zeros while none was written.
 */
function tally(p: Plant): { statements: number; evaluations: number } {
  const lines: LogEntry[] = gateLines(p);
  const last: string = lines[lines.length - 1]?.message ?? '';
  const match: RegExpMatchArray | null = last.match(/possible in (\d+) of (\d+) evaluations/);
  return { statements: Number(match?.[1] ?? 0), evaluations: Number(match?.[2] ?? 0) };
}

/**
 * Replaces the plant's answer with a chosen one, so a control flow case cannot be carried by a second
 * condition inside the gate.
 *
 * Set at the outlook rather than at the verdict, and derived from neither weather, history nor season: the
 * judgement itself still runs through the production path, so a control flow case cannot be carried by a
 * second condition inside it.
 * @param p - The plant whose manager answers.
 * @param outlook - What the plant says.
 */
function forceOutlook(p: Plant, outlook: Partial<iEnergyHistoryOutlook>): void {
  const basis: iEnergyHistoryBasis = {
    batteryCapacityKnown: true,
    consumptionWindows: 40,
    requiredConsumptionWindows: 10,
    consumptionReadingsSeen: true,
    weatherTodayKnown: true,
    consumptionTodayKnown: true,
    modelFitted: false,
  };
  const answer: iEnergyHistoryOutlook = {
    currentSoc: 35,
    remainingSunHours: 9,
    worstCaseLowSoc: undefined,
    band: undefined,
    residualSigma: undefined,
    sampleDays: 0,
    basis,
    ...outlook,
  };
  Devices.energymanager = {
    deviceCapabilities: [],
    settings: p.managerSettings,
    get batteryLevel(): number {
      return answer.currentSoc;
    },
    log(): void {
      // Deliberately empty - what this manager says is not what a control flow case is about.
    },
    get morningOutlook(): iEnergyHistoryOutlook {
      return answer;
    },
    get morningReserveVerdict(): iMorningReserveVerdict | undefined {
      return EnergyManagerUtils.morningReserveVerdict(this as unknown as iEnergyManager, answer);
    },
  } as unknown as iEnergyManager;
}

/** A bound far above the reserve, so stage 2 suppresses whatever else the situation holds. */
const OUTLOOK_SUPPRESSES: Partial<iEnergyHistoryOutlook> = { worstCaseLowSoc: 60 };
/** A bound below the reserve with no sun left, so stage 3 asks for a start. */
const OUTLOOK_REQUESTS: Partial<iEnergyHistoryOutlook> = { worstCaseLowSoc: 4, remainingSunHours: 0 };

describe('Dachs history gate', () => {
  beforeEach(() => {
    SettingsService.settings.heaterSettings = { mode: HeatingMode.Summer };
  });

  afterEach(() => {
    tearDownPlant();
  });

  describe('E - the five stage decision order', () => {
    /**
     * Builds one installation, lets it read what it recorded and runs a single evaluation on it.
     * @param soc - The state of charge to decide on.
     * @param day - The four quantities of the running day.
     * @param model - The model the plant has.
     * @param warmWater - The warm water temperature.
     * @param rows - What else the plant recorded.
     * @returns The plant, after one evaluation.
     */
    async function decide(
      soc: number,
      day: RunningDay,
      model: iEnergyHistoryModel | undefined,
      warmWater: number = WARM_WATER_OK,
      rows: Partial<PlantRowOptions> = {},
    ): Promise<Plant> {
      const p: Plant = plant();
      p.setTemperatures(warmWater, HEAT_STORAGE_OK);
      p.setBatteryLevel(soc);
      givenModel(model);
      arrangeRunningDay(p, day, rows);
      await p.load();
      p.resetRecordings();
      p.evaluate();
      return p;
    }

    it('E2 - stage 2 suppresses without any model at all', async () => {
      const estimateSpy = jest.spyOn(EnergyHistoryUtils, 'estimate');

      // D-GATE-9: 78 % minus 17.91 points of consumption leaves 60.09 %, and the plant fitted nothing.
      const result: iDachsHistoryGateResult | undefined = decision(await decide(78, D_FEAT_B8, undefined));

      expect(result?.suppress).toBe(true);
      expect(result?.request).toBe(false);
      expect(result?.reason).toContain('Stage 2');
      expect(result?.reason).toContain('60.09');
      // A bound that is only checked after a successful fit is useless on the first day - and the first day
      // is exactly the state the installation starts out in.
      expect(estimateSpy).not.toHaveBeenCalled();
    });

    it('E3 - stage 2 beats stage 3', async () => {
      // D-GATE-13: a full battery on a rainy evening asks for nothing.
      const result: iDachsHistoryGateResult | undefined = decision(await decide(78, D_FEAT_2000, undefined));

      expect(result?.suppress).toBe(true);
      expect(result?.request).toBe(false);
      expect(result?.reason).toContain('Stage 2');
    });

    it('E4 - stage 3 requests without any model at all', async () => {
      const estimateSpy = jest.spyOn(EnergyHistoryUtils, 'estimate');

      // D-GATE-10: 22 % minus 17.91 points leaves 4.09 %, and no sun is left to change that.
      const result: iDachsHistoryGateResult | undefined = decision(await decide(22, D_FEAT_2000, undefined));

      expect(result?.request).toBe(true);
      expect(result?.suppress).toBe(false);
      expect(result?.reason).toContain('Stage 3');
      expect(result?.reason).toContain('4.09');
      expect(result?.reason).toContain('0h of sun');
      expect(estimateSpy).not.toHaveBeenCalled();
    });

    it('E6 - stage 4 reaches the upper edge and acts on it just as little', async () => {
      // D-GATE-2M: 1.5 remaining sun hours keep stage 3 out, the upper edge at 13.55 misses the reserve.
      const result: iDachsHistoryGateResult | undefined = decision(await decide(28, D_FEAT_2M, D_MODEL_A));

      expect(result?.request).toBe(false);
      expect(result?.suppress).toBe(false);
      expect(result?.reason).toContain('Stage 4');
      expect(result?.upperEdgeSoc).toBeCloseTo(13.55, 2);
    });

    it('E7a - the bound is named even where it does not turn the decision', async () => {
      // D-GATE-11a: the bound at 17.09 sits above the model lower edge at 15.0, both below the reserve.
      const result: iDachsHistoryGateResult | undefined = decision(await decide(35, D_FEAT_11A, D_MODEL_A));

      expect(result?.suppress).toBe(false);
      expect(result?.request).toBe(false);
      expect(result?.lowerEdgeSoc).toBeCloseTo(15.0, 2);
      // The effective value of the two is 17.09; without it in the reason a suppression from the bound and
      // one from the model read alike in operation.
      expect(result?.reason).toContain('17.09');
    });

    it('E8 - stage 5 leaves the stock behaviour alone', async () => {
      // D-GATE-3: the point estimate at 20.8 holds the reserve, the lower edge at 16.8 does not.
      const p: Plant = await decide(32, D_FEAT_B8, D_MODEL_A);

      expect(decision(p)?.suppress).toBe(false);
      expect(decision(p)?.request).toBe(false);
      expect(decision(p)?.reason).toContain('Stage 5');
      expect(decision(p)?.lowerEdgeSoc).toBeCloseTo(16.8, 2);
      expect(decision(p)?.upperEdgeSoc).toBeCloseTo(24.8, 2);
      // The stock lift is what decides here, not the gate.
      expect(liftedBlock(p)).toBe(true);
    });

    it('E9 - does not suppress when there is no consumption history at all', async () => {
      // D-GATE-14: a high state of charge, but nothing to calculate a bound from.
      const result: iDachsHistoryGateResult | undefined = decision(
        await decide(78, D_FEAT_B8, undefined, WARM_WATER_OK, { days: 0, consumedTodayKwh: undefined }),
      );

      // Without this rule the bound equals the current state of charge and stage 2 suppresses on no data
      // at all - on exactly the day the database is empty.
      expect(result?.suppress).toBe(false);
      expect(result?.request).toBe(false);
      expect(result?.reason).toContain('no consumption history');
    });

    it('E10 - pins the threshold below which no sun is left', async () => {
      const stages: string[] = [];
      for (const hours of [0.0, 0.2, 0.6, 1.5]) {
        const result: iDachsHistoryGateResult | undefined = decision(
          await decide(22, { ...D_FEAT_2000, remainingSunHours: hours }, undefined),
        );
        stages.push(result?.reason ?? '');
        tearDownPlant();
      }

      // The threshold is a named setting at 0.5 h, not an epsilon every implementation picks for itself.
      expect(stages[0]).toContain('Stage 3');
      expect(stages[1]).toContain('Stage 3');
      expect(stages[2]).toContain('Stage 5');
      expect(stages[3]).toContain('Stage 5');
    });

    it('E13 - says nothing at all while the plant has no energy manager', async () => {
      const p: Plant = plant();
      p.setTemperatures(WARM_WATER_OK, HEAT_STORAGE_OK);
      p.setBatteryLevel(22);
      givenModel(undefined);
      arrangeRunningDay(p, D_FEAT_2000);
      await p.load();
      Devices.energymanager = undefined;
      p.resetRecordings();

      p.evaluate();

      // Without a manager there is neither a capacity nor a state of charge, so there is not even a starting
      // point for a projection - the reason that names the capacity belongs to the case below, where a
      // manager is there and only the field is missing.
      expect(decision(p)).toBeUndefined();
    });

    it('E13b - says nothing while the energy manager has no capacity field', async () => {
      // The shape of an energy manager whose settings simply do not carry the field, rather than carrying it
      // as zero. It still states how its history is read and still reports a charge level, so the plant does
      // answer - it just cannot convert a kWh into a point of charge.
      const p: Plant = plant({ batteryCapacityWattage: undefined });
      p.setTemperatures(WARM_WATER_OK, HEAT_STORAGE_OK);
      p.setBatteryLevel(22);
      givenModel(undefined);
      arrangeRunningDay(p, D_FEAT_2000);
      await p.load();
      p.resetRecordings();

      p.evaluate();

      // Without a capacity there is no conversion between kWh and state of charge points. Reading the bound
      // as zero would put the evening stage on "the morning is empty" and ask for a start every evening at
      // every state of charge - the direction that burns gas, and on an installation whose energy manager
      // has no capacity field it would do so every single day.
      expect(decision(p)?.suppress).toBe(false);
      expect(decision(p)?.request).toBe(false);
      expect(decision(p)?.reason).toContain('no battery capacity reported');
      expect(decision(p)?.reason).not.toContain('worst case low 0%');
    });
  });

  describe('M - the quality bar of the recorded data is stated by the plant, not by the asking device', () => {
    /**
     * An installation with a recorded history, at a charge level stage 2 would suppress at.
     *
     * How many usable nights the plant ends up with is asked rather than assumed - whether the oldest
     * recorded night is complete enough to count depends on the hour the suite runs at, and the boundary is
     * pinned against the number the plant reports rather than against a number this file guessed.
     * @returns The plant and the number of nights it made of what it recorded.
     */
    async function plantWithRecordedNights(): Promise<{ p: Plant; nights: number }> {
      const p: Plant = plant();
      p.setTemperatures(WARM_WATER_OK, HEAT_STORAGE_OK);
      p.setBatteryLevel(78);
      givenModel(undefined);
      arrangeRunningDay(p, D_FEAT_B8, { days: 12 });
      await p.load();
      const nights: number = Devices.energymanager?.morningOutlook?.basis.consumptionWindows ?? 0;
      expect(nights).toBeGreaterThan(1);
      p.resetRecordings();
      return { p, nights };
    }

    it('M1 - measures the consumption windows against the number the energy manager states', async () => {
      const { p, nights } = await plantWithRecordedNights();
      p.managerSettings.historyMinimumConsumptionDays = nights + 1;

      p.evaluate();

      // One short of what the plant demands - and the operator is told the plant's number, not the unit's.
      expect(decision(p)?.suppress).toBe(false);
      expect(decision(p)?.reason).toContain(`only ${nights} of ${nights + 1} required consumption windows`);
    });

    it('M1b - decides again at the number the energy manager states', async () => {
      const { p, nights } = await plantWithRecordedNights();
      p.managerSettings.historyMinimumConsumptionDays = nights;

      p.evaluate();

      // Only the pair pins the boundary at the stated number; a single case leaves open whether the answer
      // came from the plant's number or from some other one below the recorded count.
      expect(decision(p)?.suppress).toBe(true);
      expect(decision(p)?.reason).toContain('Stage 2');
    });
  });

  describe('R19 - the dials of this decision are effective, wherever they are stated', () => {
    it('lets the reserve move which stage decides', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setBatteryLevel(32);
      givenModel(D_MODEL_A);
      arrangeRunningDay(p, D_FEAT_B8);
      await p.load();

      p.evaluate();
      expect(decision(p)?.reason).toContain('Stage 5');

      // Stated on the energy manager, which is where the reserve of the plant's battery lives - and it still
      // has to reach the consumer's decision, otherwise the dial was moved rather than kept.
      p.managerSettings.minimumMorningSocReserve = 15;
      p.evaluate();

      // Lower edge 16.8 holds 15 but not 20 - "settings exist" is not the requirement, "effective" is. The
      // stage is what moves; that stage 4 does not act is a decision of its own, not of this setting.
      expect(decision(p)?.reason).toContain('Stage 4');
      expect(decision(p)?.reason).toContain('the lower band edge holds the reserve');
    });

    it('lets the band width the plant states move which stage decides', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setBatteryLevel(32);
      givenModel(D_MODEL_A);
      arrangeRunningDay(p, D_FEAT_B8);
      await p.load();

      p.evaluate();
      expect(decision(p)?.reason).toContain('Stage 5');

      // Stated on the energy manager, which is where the band width lives now - and it still has to reach the
      // consumer's decision, otherwise the dial was moved rather than kept.
      p.managerSettings.historyBandSigma = 0;
      p.evaluate();

      // With a collapsed band the point estimate at 20.8 holds the reserve of 20.
      expect(decision(p)?.reason).toContain('Stage 4');
      expect(decision(p)?.lowerEdgeSoc).toBeCloseTo(20.8, 2);
    });
  });

  describe('R9, R10 - where the gate sits in the control flow', () => {
    it('sets the start block when it suppresses', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.blockDachsStart.actuatorOn = false;
      forceOutlook(p, OUTLOOK_SUPPRESSES);
      p.resetRecordings();

      p.evaluate();

      const block: ActuatorSetStateCommand | undefined = p.blockDachsStart.commands.find(
        (c: ActuatorSetStateCommand) => c.on,
      );
      expect(block).toBeDefined();
      expect(block?.reasonTrace).toContain('History gate');
      expect(liftedBlock(p)).toBe(false);
    });

    it('a forced suppression does not swallow a winter start with a cold heat storage', async () => {
      const p: Plant = plant();
      SettingsService.settings.heaterSettings = { mode: HeatingMode.Winter };
      p.setTemperatures(WARM_WATER_OK, HEAT_STORAGE_COLD);
      // Exactly the same forced answer as above, so nothing but the position in the control flow can make
      // the difference - and it is forced rather than derived, so no second condition inside the gate can
      // carry this case.
      forceOutlook(p, OUTLOOK_SUPPRESSES);
      p.resetRecordings();

      p.evaluate();

      expect(started(p)).toBe(true);
      // Not only the return value has to sit behind the heat driven block - the actuator write does too.
      // A block commanded on while the unit is being started is the same mistake one level down.
      expect(p.blockDachsStart.commands.some((c: ActuatorSetStateCommand) => c.on)).toBe(false);
      // And the mirror image of it: the release the empty battery earns must not stay withheld while the
      // unit is being started. A standing block during a start is the same fault as a fresh one.
      expect(liftedBlock(p)).toBe(true);
    });

    it('does not attach itself to a non-start the stock logic produces anyway', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setTemperatures(WARM_WATER_OK, HEAT_STORAGE_FULL);
      forceOutlook(p, OUTLOOK_SUPPRESSES);
      p.resetRecordings();

      p.evaluate();

      // The full heat storage is the stock reason not to start, and it is decided before the gate is read.
      // A gate that claimed this outcome would write its block; instead the stock release happens, exactly
      // as it would without the gate, and R12 stays checkable.
      expect(started(p)).toBe(false);
      expect(p.blockDachsStart.commands.some((c: ActuatorSetStateCommand) => c.on)).toBe(false);
      expect(liftedBlock(p)).toBe(true);
    });

    it('still releases the block for an empty battery while the unit is already running', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      // Nothing recorded, so no stage speaks - the state the whole gate has nothing to say about, alongside
      // a unit that is already running.
      givenModel(undefined);
      Persistence.dbo = plantPersistence({ days: 0, consumedTodayKwh: undefined, todayWeather: false });
      await p.load();
      (p.dachs as unknown as { _dachsOn: boolean })._dachsOn = true;
      p.resetRecordings();

      p.evaluate();

      // Without a statement this has to read exactly like the stock behaviour: no start, and the release the
      // empty battery earns. A return that travels back above the actuator write would withhold it here and
      // in no other case - a behaviour difference on a plant where nothing changed.
      expect(decision(p)?.suppress).toBe(false);
      expect(started(p)).toBe(false);
      expect(liftedBlock(p)).toBe(true);
    });

    it('writes the block for an empty battery while the unit is already running and the gate suppresses', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      (p.dachs as unknown as { _dachsOn: boolean })._dachsOn = true;
      forceOutlook(p, OUTLOOK_SUPPRESSES);
      p.resetRecordings();

      p.evaluate();

      expect(started(p)).toBe(false);
      const block: ActuatorSetStateCommand | undefined = p.blockDachsStart.commands.find(
        (c: ActuatorSetStateCommand) => c.on,
      );
      expect(block).toBeDefined();
      expect(block?.reasonTrace).toContain('History gate');
      expect(liftedBlock(p)).toBe(false);
    });

    it('keeps a forced request off the heat driven ceiling', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setTemperatures(WARM_WATER_OK, HEAT_STORAGE_FULL);
      forceOutlook(p, OUTLOOK_REQUESTS);
      p.resetRecordings();

      p.evaluate();

      // A full heat storage is the stock reason not to start; the gate must not claim that outcome for
      // itself, and it must not overrule it either.
      expect(decision(p)?.request).toBe(true);
      expect(started(p)).toBe(false);
    });

    it('suppresses in summer and stays out of winter in an otherwise identical situation', async () => {
      const summer: Plant = plant();
      arrangeSummerOperation(summer);
      summer.setBatteryLevel(35);
      givenModel(D_MODEL_A);
      // A quiet night, so the suppression comes from the model free bound - the only kind that still acts.
      arrangeRunningDay(summer, D_FEAT_CLEARMORN, { readingKwh: (): number => QUIET_READING_KWH });
      await summer.load();
      summer.evaluate();
      expect(decision(summer)?.suppress).toBe(true);
      tearDownPlant();

      const winter: Plant = plant();
      SettingsService.settings.heaterSettings = { mode: HeatingMode.Winter };
      winter.setTemperatures(WARM_WATER_OK, HEAT_STORAGE_OK);
      winter.setBatteryLevel(35);
      givenModel(D_MODEL_A);
      arrangeRunningDay(winter, D_FEAT_CLEARMORN, { readingKwh: (): number => QUIET_READING_KWH });
      await winter.load();
      winter.resetRecordings();

      winter.evaluate();

      // A single one of the two is worthless; the pair is the statement.
      expect(decision(winter)).toBeUndefined();
      expect(liftedBlock(winter)).toBe(true);
    });
  });

  describe('R11 - warm water below the minimum overrides the gate', () => {
    it('yields neither suppression nor request while the warm water is below the minimum', async () => {
      const p: Plant = plant();
      // Arranged so the stock logic actually starts once the gate steps aside, otherwise a green case would
      // say nothing about the unit running.
      jest.spyOn(TimeCallbackService, 'dayType').mockReturnValue(TimeOfDay.Night);
      p.dachs.settings.batteryLevelBeforeNightTurnOnThreshold = 40;
      p.setTemperatures(WARM_WATER_COLD, HEAT_STORAGE_OK);
      p.setBatteryLevel(35);
      givenModel(D_MODEL_A);
      // A quiet night, so the bound would suppress if stage 1 did not answer first.
      arrangeRunningDay(p, D_FEAT_CLEARMORN, { readingKwh: (): number => QUIET_READING_KWH });
      await p.load();
      p.resetRecordings();

      p.evaluate();

      expect(decision(p)?.suppress).toBe(false);
      expect(decision(p)?.request).toBe(false);
      expect(decision(p)?.reason).toContain('warm water');
      expect(p.blockDachsStart.commands.some((c: ActuatorSetStateCommand) => c.on)).toBe(false);
      expect(started(p)).toBe(true);
    });

    it('suppresses again once the warm water is fine', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setBatteryLevel(35);
      givenModel(D_MODEL_A);
      arrangeRunningDay(p, D_FEAT_CLEARMORN, { readingKwh: (): number => QUIET_READING_KWH });
      await p.load();
      p.resetRecordings();

      p.evaluate();

      // Without the counter case a gate that never suppresses passes the case above.
      expect(decision(p)?.suppress).toBe(true);
    });
  });

  describe('a marker for "no reading" must not be projected like a state of charge', () => {
    it('says nothing while the energy manager reports no state of charge', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      givenModel(D_MODEL_A);
      arrangeRunningDay(p, D_FEAT_CLEARMORN);
      await p.load();
      // Run through the projection the marker lands one point below an empty battery, and on a clear morning
      // the band around it still clears the reserve - so the gate would force a block at exactly the charge
      // level at which the release is due.
      p.setBatteryLevel(NO_STATE_OF_CHARGE);
      p.resetRecordings();

      p.evaluate();

      expect(decision(p)).toBeUndefined();
      // Read off the actuator rather than off the decision: no statement must not become a forced block.
      expect(p.blockDachsStart.commands.some((c: ActuatorSetStateCommand) => c.on)).toBe(false);
    });
  });

  describe('R12 - without recorded data nothing changes', () => {
    it('leaves the stock lift of the start block alone while the plant recorded nothing', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setBatteryLevel(35);
      givenModel(undefined);
      // Neither a consumption history nor a weather aggregate: the situation of an installation on its first
      // day, and the one this whole change promised to leave exactly as it found it.
      Persistence.dbo = plantPersistence({ days: 0, consumedTodayKwh: undefined, todayWeather: false });
      await p.load();
      p.resetRecordings();

      p.evaluate();

      const lift: ActuatorSetStateCommand | undefined = p.blockDachsStart.commands.find(
        (c: ActuatorSetStateCommand) => !c.on,
      );
      expect(lift?.reasonTrace).toContain('now allowed to run if needed');
      expect(p.blockDachsStart.commands.some((c: ActuatorSetStateCommand) => c.on)).toBe(false);
      expect(started(p)).toBe(false);
      // What such an installation *does* see that it did not before: the gate says, per evaluation, that it
      // has nothing to say - and never that it recorded a verdict, because no stage reached one.
      expect(gateLines(p)).toHaveLength(1);
      expect(gateLines(p)[0].message).toContain('no statement');
      expect(p.logs.filter((entry: LogEntry) => entry.message.startsWith('Model shadow'))).toHaveLength(0);
    });
  });

  describe('R8b, R13 - too little history and no data basis', () => {
    it('neither suppresses nor requests when there is too little history', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setBatteryLevel(35);
      givenModel(undefined);
      arrangeRunningDay(p, D_FEAT_CLEARMORN);
      await p.load();
      p.resetRecordings();

      p.evaluate();

      expect(decision(p)?.suppress).toBe(false);
      expect(decision(p)?.request).toBe(false);
      expect(decision(p)?.sampleDays).toBe(0);
      expect(liftedBlock(p)).toBe(true);
    });

    it('reports how often a statement was possible', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setBatteryLevel(32);
      arrangeRunningDay(p, D_FEAT_B8);
      // Read off a line that exists: the tally is a running count, and what a case can measure is the
      // difference two evaluations make rather than the absolute number an arrangement already ran up.
      p.evaluate();
      const before: { statements: number; evaluations: number } = tally(p);

      for (const model of [D_MODEL_A, undefined, D_MODEL_A, undefined, D_MODEL_A]) {
        givenModel(model);
        // Past the hourly interval, so the plant really reads its history anew and the model changes with it.
        p.advanceThrottles(2 * HOUR_MS);
        await p.load();
        p.evaluate();
      }

      // Without this number the backtest of the whole approach cannot be evaluated.
      const after: { statements: number; evaluations: number } = tally(p);
      expect(after.evaluations - before.evaluations).toBe(5);
      expect(after.statements - before.statements).toBe(3);
    });

    it('does not act and does not throw when the persistence is absent', () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      Persistence.dbo = undefined;
      p.resetRecordings();

      expect(() => {
        p.refresh();
        p.evaluate();
        p.refresh();
        p.evaluate();
      }).not.toThrow();

      expect(decision(p)?.suppress).toBe(false);
      expect(decision(p)?.request).toBe(false);
      // Exactly one line about it, not ten per run.
      expect(p.logs.filter((entry: LogEntry) => entry.message.includes('no data basis'))).toHaveLength(1);
    });

    it('does not carry a suppression over a loss of the consumption history', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setBatteryLevel(78);
      givenModel(undefined);
      arrangeRunningDay(p, D_FEAT_B8);
      await p.load();
      p.evaluate();
      expect(decision(p)?.suppress).toBe(true);

      // The database is there and answers, but it holds nothing any more - a restore, a purge, a wiped table.
      Persistence.dbo = plantPersistence({ days: 0, consumedTodayKwh: undefined, todayWeather: false });
      p.advanceThrottles(2 * HOUR_MS);
      await p.load();
      p.evaluate();

      expect(decision(p)?.suppress).toBe(false);
    });

    it('makes no model statement when the weather aggregates are missing', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setBatteryLevel(35);
      givenModel(D_MODEL_A);
      arrangeRunningDay(p, { ...D_FEAT_CLEARMORN, remainingSunHours: 11.0 }, { todayWeather: false });
      await p.load();
      p.resetRecordings();

      p.evaluate();

      // No substitute value for cloud cover or maximum temperature: it would apply the model to an invented
      // quantity and make a failure look like a success. What is missing is the model branch, not the
      // decision as such - with sun left and the bound below the reserve no stage speaks here.
      expect(decision(p)?.reason).toContain('no weather aggregate for the running day');
      expect(decision(p)?.suppress).toBe(false);
      expect(decision(p)?.request).toBe(false);
      // Read back off the decision: the horizon is the arranged one, not the sun of the hour the suite runs
      // at. Without the pin this case asks for a start after sunset and passes before it.
      expect(decision(p)?.reason).toContain('11h of sun left');
    });

    it('still asks for a start without any weather aggregate once no sun is left', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      // B9: a rainy evening with the charge running short - 35 % minus 17.91 points leaves 17.09 %.
      p.setBatteryLevel(35);
      givenModel(D_MODEL_A);
      arrangeRunningDay(p, { ...D_FEAT_CLEARMORN, remainingSunHours: 0 }, { todayWeather: false });
      await p.load();
      p.resetRecordings();

      p.evaluate();

      // The counter case to the one above: stage 3 is built to decide without any weather at all, and an
      // installation whose weather table is empty must still get its evening start (K2).
      expect(decision(p)?.reason).toContain('Stage 3');
      expect(decision(p)?.request).toBe(true);
      expect(decision(p)?.suppress).toBe(false);
    });

    it('recovers on the next evaluation', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setBatteryLevel(35);
      givenModel(D_MODEL_A);
      arrangeRunningDay(p, D_FEAT_CLEARMORN, { todayWeather: false });
      await p.load();
      p.evaluate();
      expect(decision(p)?.reason).toContain('no weather aggregate for the running day');

      // The backfill has stored the running day meanwhile, which is what an installation looks like an hour
      // after its first start.
      arrangeRunningDay(p, D_FEAT_CLEARMORN);
      p.advanceThrottles(2 * HOUR_MS);
      await p.load();
      p.evaluate();

      // A single failed path must not switch the gate off for good - the model side reaches a verdict again,
      // which is what recovering means now that the verdict itself is only recorded.
      expect(decision(p)?.reason).toContain('Stage 4');
    });
  });

  describe('R16, R16b, R16c - at any time of day, over both edges of one band', () => {
    it('evaluates independently at three moments of the same day', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setBatteryLevel(35);
      givenModel(D_MODEL_A);
      arrangeRunningDay(p, D_FEAT_CLEARMORN);
      await p.load();
      // Read off a line that exists; the tally is a running count, see the case on it above.
      p.evaluate();
      const before: { statements: number; evaluations: number } = tally(p);
      const bands: number[] = [];

      for (const day of [
        { ...D_FEAT_CLEARMORN, remainingSunHours: 14.87, consumedSoFarKwh: 3.6, cloudCover: 8, maxTemperature: 27.5 },
        { ...D_FEAT_CLEARMORN, remainingSunHours: 12.87, consumedSoFarKwh: 5.4, cloudCover: 8, maxTemperature: 27.5 },
        D_FEAT_2000,
      ]) {
        arrangeRunningDay(p, day);
        p.advanceThrottles(2 * HOUR_MS);
        await p.load();
        p.evaluate();
        bands.push(decision(p)?.lowerEdgeSoc ?? Number.NaN);
      }

      // No cached morning result and no "once a day".
      expect(tally(p).evaluations - before.evaluations).toBe(3);
      expect(new Set(bands).size).toBe(3);
    });

    it('never suppresses and requests at once', async () => {
      const situations: [number, RunningDay][] = [
        [35, D_FEAT_CLEARMORN],
        [28, D_FEAT_2M],
        [32, D_FEAT_B8],
        [12, D_FEAT_DULLMORN],
      ];
      for (const [soc, day] of situations) {
        for (const bandSigma of [1.0, 0]) {
          const p: Plant = plant({ historyBandSigma: bandSigma });
          arrangeSummerOperation(p);
          p.setBatteryLevel(soc);
          givenModel(D_MODEL_A);
          arrangeRunningDay(p, day);
          await p.load();
          p.evaluate();

          // With a collapsed band a sloppy pair of comparisons tips into claiming both at once.
          expect(decision(p)?.suppress === true && decision(p)?.request === true).toBe(false);
          tearDownPlant();
        }
      }
    });

    it('asks for no start on a clear morning and for one on a rainy evening at the same charge', async () => {
      const morning: Plant = plant();
      arrangeSummerOperation(morning);
      morning.setBatteryLevel(28);
      givenModel(D_MODEL_A);
      arrangeRunningDay(morning, D_FEAT_BASE);
      await morning.load();
      morning.resetRecordings();
      morning.evaluate();

      // While the sun is still up the model free stages have nothing to say, and the model stage that does
      // is the one that only records - so no start is asked for.
      expect(decision(morning)?.request).toBe(false);
      expect(decision(morning)?.suppress).toBe(false);
      expect(decision(morning)?.upperEdgeSoc).toBeCloseTo(47.9, 2);
      expect(started(morning)).toBe(false);
      tearDownPlant();

      const evening: Plant = plant();
      arrangeSummerOperation(evening);
      // The state of charge is unchanged; only the day and the forecast differ.
      evening.setBatteryLevel(28);
      givenModel(D_MODEL_A);
      arrangeRunningDay(evening, D_FEAT_2000);
      await evening.load();
      evening.resetRecordings();

      evening.evaluate();

      expect(decision(evening)?.request).toBe(true);
      expect(decision(evening)?.reason).toContain('Stage 3');
      expect(started(evening)).toBe(true);
    });
  });

  describe('R18 - log and output', () => {
    it('exposes the gate result through toJSON, numbers and reason alike', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      p.setBatteryLevel(35);
      givenModel(D_MODEL_A);
      arrangeRunningDay(p, D_FEAT_CLEARMORN);
      await p.load();
      p.evaluate();

      const json: Record<string, unknown> = p.dachs.toJSON() as unknown as Record<string, unknown>;
      const result: iDachsHistoryGateResult = json['_historyGateResult'] as iDachsHistoryGateResult;

      expect(result).toBeDefined();
      // Stage 4, which reports its verdict and acts on neither direction of it.
      expect(result.suppress).toBe(false);
      expect(result.request).toBe(false);
      expect(result.reason).toContain('Stage 4');
      expect(result.currentSoc).toBe(35);
      expect(result.lowerEdgeSoc).toBeCloseTo(57.4, 2);
      expect(result.upperEdgeSoc).toBeCloseTo(65.4, 2);
      expect(result.reserve).toBe(20);
      expect(result.sampleDays).toBe(20);
      // The same four numbers in the line the operator reads, not only in the fields a dashboard reads.
      expect(result.reason).toContain('57.4');
      expect(result.reason).toContain('65.4');
      expect(result.reason).toContain('reserve 20');
      expect(result.reason).toContain('20 days');
    });

    it('logs on info when the decision changes and on debug when it does not', async () => {
      const p: Plant = plant();
      arrangeSummerOperation(p);
      // Two situations that differ in what the gate *does*, not only in what it says: stage 2 suppresses at
      // a high charge, stage 3 asks for a start on a rainy evening at a low one.
      p.setBatteryLevel(78);
      givenModel(D_MODEL_A);
      arrangeRunningDay(p, D_FEAT_B8);
      await p.load();
      p.resetRecordings();

      p.evaluate();
      p.evaluate();
      p.setBatteryLevel(22);
      p.pinSun(0);
      p.evaluate();
      p.evaluate();

      const levels: LogLevel[] = gateLines(p).map((entry: LogEntry) => entry.level);
      // A gate that always writes on info produces noise instead of a log, one line per evaluation.
      expect(levels).toEqual([LogLevel.Info, LogLevel.Debug, LogLevel.Info, LogLevel.Debug]);
    });
  });

  describe('a missing heating configuration is no statement of summer', () => {
    /** The two contract ceilings of the unit's own settings. */
    const WINTER_CEILING: number = 75;
    const SUMMER_CEILING: number = 58;
    /** Above both ceilings, and below the heat storage so an earlier branch cannot decide instead. */
    const WARM_WATER_ABOVE_EVERY_CEILING: number = 80;
    const HEAT_STORAGE_HOTTER_STILL: number = 85;

    /**
     * Runs one evaluation with warm water above every ceiling and a running pump, so the command that turns
     * the pump off names the ceiling that was applied.
     * @param heaterMode - The configured heating mode, or undefined for an installation without one.
     * @returns The reasons of the commands the pump was given.
     */
    function reasonsOfPumpCommands(heaterMode: HeatingMode | undefined): string[] {
      const p: Plant = plant();
      SettingsService.settings.heaterSettings = heaterMode === undefined ? undefined : { mode: heaterMode };
      const pump: RecordingActuator = recordingActuator(true);
      p.dachs.warmWaterPump = pump as unknown as iActuator;

      p.setTemperatures(WARM_WATER_ABOVE_EVERY_CEILING, HEAT_STORAGE_HOTTER_STILL);

      return pump.commands.map((c: ActuatorSetStateCommand) => c.reason);
    }

    it('keeps the conservative ceiling while no heating mode is configured at all', () => {
      // The heating settings are optional, and an installation without them states no season. Reading that
      // absence as summer costs such an installation the whole warm water ceiling, all year and without a
      // switch to notice it by.
      expect(reasonsOfPumpCommands(undefined).some((reason: string) => reason.includes(`${WINTER_CEILING}°C`))).toBe(
        true,
      );
    });

    it('still lowers the ceiling once summer is configured', () => {
      // The counter case: without it a ceiling that never lowers passes the case above.
      expect(
        reasonsOfPumpCommands(HeatingMode.Summer).some((reason: string) => reason.includes(`${SUMMER_CEILING}°C`)),
      ).toBe(true);
    });
  });

  /**
   * K6 - a daylight saving change must not shift the older half of the window.
   *
   * Kept in this file rather than moved to the plant's own suite because the daylight saving run selects its
   * files by name (see the `jest-dst` script), and this is the only case in the whole work that needs a zone
   * other than the one the suite otherwise runs in.
   *
   * The evaluation moments are the one place with no public seam to observe this through - they are built
   * inside the read and never handed out - so this reaches for the private helper that builds them. That is
   * the exception, and it is why the case sits under its own heading.
   */
  describe('K6 - a daylight saving change must not shift the older half of the window', () => {
    // In UTC no clock ever changes, so calendar day steps and 86400000 ms steps are the same thing and
    // nothing here can discriminate. The zone cannot be switched from inside the file either: jest hands
    // each file a sandboxed `process`, so `process.env.TZ = 'Europe/Berlin'` reads back as Berlin while V8
    // keeps resolving UTC - see jest.config.js, where the zone is set before the workers start. Rather than
    // pass vacuously the case declares itself skipped, and the runner supplies the zone via
    // HOFFMATION_TEST_TZ.
    const zoneHasDaylightSaving: boolean =
      new Date('2026-07-01T12:00:00Z').getTimezoneOffset() !== new Date('2026-12-01T12:00:00Z').getTimezoneOffset();
    const itInADaylightSavingZone = zoneHasDaylightSaving ? it : it.skip;

    it('runs in the zone the runner selected', () => {
      // The case below skips itself outside a zone that observes daylight saving, so a zone selection that
      // did not take effect - the run silently continuing in UTC - looks exactly like a passing suite. This
      // is what tells the two apart, and it is why the runner names the zone in an environment variable
      // instead of only handing it to V8.
      const requestedZone: string = process.env.HOFFMATION_TEST_TZ ?? 'UTC';

      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(requestedZone);
      expect(zoneHasDaylightSaving).toBe(requestedZone !== 'UTC');
    });

    itInADaylightSavingZone('keeps every evaluation moment at the local time of day of the reference', () => {
      const reference: Date = new Date(2026, 10, 15, 12, 0, 0, 0);

      const moments: Date[] = (
        EnergyHistoryService as unknown as { historyMoments(reference: Date, windowDays: number): Date[] }
      ).historyMoments(reference, 90);

      // The window reaches back over the end of summer time. Subtracting days as milliseconds would put
      // every moment beyond the change at 11:00 local time and compare it against a 12:00 consumption.
      expect(moments.length).toBe(90);
      expect(moments.some((moment: Date) => moment.getMonth() < 9)).toBe(true);
      for (const moment of moments) {
        expect(moment.getHours()).toBe(12);
        expect(moment.getMinutes()).toBe(0);
      }
    });
  });
});
