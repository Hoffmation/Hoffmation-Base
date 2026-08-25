import _ from 'lodash';
import {
  ActuatorChangeAction,
  BaseAction,
  BatteryLevelChangeAction,
  TemperatureSensorChangeAction,
} from '../../action';
import {
  iActuator,
  iBaseDevice,
  iBatteryDevice,
  iDachsDeviceSettings,
  iDachsHistoryGateResult,
  iDachsSettings,
  iFlattenedCompleteResponse,
  iFossilGeneratorSource,
  iMorningReserveVerdict,
} from '../../interfaces';
import { DachsDeviceSettings } from '../../settingsObjects';
import {
  CollisionSolving,
  CommandSource,
  DeviceCapability,
  DeviceType,
  HeatingMode,
  LogDebugType,
  LogLevel,
  TimeOfDay,
} from '../../enums';
import { DachsTemperatureSensor } from './dachsTemperatureSensor';
import { DachsHttpClient, DachsInfluxClient } from './lib';
import { DeviceInfo } from '../DeviceInfo';
import { Devices } from '../devices';
import { Utils } from '../../utils';
import { LampUtils } from '../sharedFunctions';
import { SunTimeOffsets } from '../../models';
import {
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  BlockAutomaticCommand,
  RestoreTargetAutomaticValueCommand,
} from '../../command';
import { BlockAutomaticHandler, Persistence, TimeCallbackService } from '../../services';
import { SettingsService } from '../../settings-service';
import { RoomBaseDevice } from '../RoomBaseDevice';

/**
 * What an energy manager reports while its battery states no charge level at all - see the battery level of
 * `victron-device.ts`, which answers with this instead of a level.
 *
 * A marker, not a low battery: read as a number it lands below every threshold of this unit, so whoever
 * decides on it has to tell the two apart first.
 */
const NO_STATE_OF_CHARGE: number = -1;

export class Dachs extends RoomBaseDevice implements iBaseDevice, iActuator, iFossilGeneratorSource {
  /** @inheritDoc */
  public settings: iDachsDeviceSettings = new DachsDeviceSettings();
  /** @inheritDoc */
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  /** @inheritDoc */
  public readonly deviceCapabilities: DeviceCapability[] = [];
  /**
   * A reference to the Temperature measuring warm water temperature
   */
  public readonly warmWaterSensor: DachsTemperatureSensor;
  /**
   * A reference to the Temperature measuring heat storage temperature
   */
  public readonly heatStorageTempSensor: DachsTemperatureSensor;
  /**
   * An external actuator controlling the warm water pump
   */
  public warmWaterPump?: iActuator;
  /**
   * An external actuator controlling the heat rod.
   */
  public heatingRod?: iActuator;
  /**
   * An external actuator to prevent the Dachs from starting.
   */
  public blockDachsStart?: iActuator;
  /**
   * An external actuator controlling some device to heat the warm water while the Dachs is prohibited from starting.
   */
  public warmWaterDachsAlternativeActuator?: iActuator;
  private readonly client: DachsHttpClient;
  private readonly config: iDachsSettings;
  /** @inheritDoc */
  public queuedValue: boolean | null = null;
  /** @inheritDoc */
  public targetAutomaticState: boolean = false;
  private readonly _influxClient: DachsInfluxClient | undefined;
  private _dachsOn: boolean = false;
  private _tempWarmWater: number = 0;
  private _tempHeatStorage: number = 0;
  private fetchedData: iFlattenedCompleteResponse | undefined;
  /*
   * The timestamp of the last time the Block was enforced.
   */
  private _blockStarted: number = 0;
  /** The decision of the last history gate evaluation; undefined out of season or without a charge level. */
  private _historyGateResult: iDachsHistoryGateResult | undefined;
  private _historyGateEvaluations: number = 0;
  private _historyGateStatements: number = 0;
  private _lastGateDecision: string | undefined;

  /** @inheritDoc */
  public get customName(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public get actuatorOn(): boolean {
    return this._dachsOn;
  }

  /**
   * The unit persists its own state changes under {@link id}, so this is the id they are recorded under.
   * @inheritDoc
   */
  public get actuatorId(): string {
    return this.id;
  }

  /**
   * A live view of the setting rather than a copy: it is editable at runtime, and the correction of a
   * historical day describes the unit as it is configured now.
   * @inheritDoc
   */
  public get ratedElectricalWattage(): number {
    return this.settings.dachsRatedElectricalWattage;
  }

  /**
   * A live view of the setting, for the same reason as {@link ratedElectricalWattage}.
   * @inheritDoc
   */
  public get conversionFactor(): number {
    return this.settings.dachsConversionFactor;
  }

  /**
   * The upper warm water temperature the Dachs is currently allowed to heat to.
   *
   * Only a stated warm season lowers the ceiling. The heating settings are optional and fall back to
   * {@link HeatingMode.None}, so "not winter" covers the installation that states nothing at all - and
   * reading that absence as summer takes the ceiling away from it the whole year round, without a switch
   * anywhere to notice it by.
   * @returns The applicable maximum warm water temperature in °C.
   */
  private get currentWarmWaterMaxTemp(): number {
    const mode: HeatingMode = SettingsService.heatMode;
    return mode === HeatingMode.Summer || mode === HeatingMode.TransitionalSeason
      ? this.settings.summerWarmWaterDesiredMaxTemp
      : this.settings.warmWaterDesiredMaxTemp;
  }

  public constructor(options: iDachsSettings) {
    const info = new DeviceInfo();
    info.fullName = 'Dachs';
    info.customName = `Dachs ${options.roomName}`;
    const allDevicesKey = `dachs-${options.roomName}`;
    info.allDevicesKey = allDevicesKey;
    info.room = options.roomName;
    super(info, DeviceType.Dachs);
    this.jsonOmitTopLevelKeys.push(...['warmWaterPump', 'heatingRod']);
    this.jsonOmitKeys.push(
      ...[
        'client',
        'config',
        '_influxClient',
        'warmWaterSensor',
        'heatStorageTempSensor',
        'blockDachsStart',
        'warmWaterDachsAlternativeActuator',
      ],
    );
    Devices.alLDevices[allDevicesKey] = this;
    this.deviceCapabilities.push(DeviceCapability.actuator);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
    // How the unit announces itself as one of the plant's fuel burning generators: whoever corrects a
    // historical charge level for fuel burnt reads the device list, not a list handed to it by a caller.
    this.deviceCapabilities.push(DeviceCapability.fossilGenerator);
    if (options.influxDb) {
      this._influxClient = new DachsInfluxClient(options.influxDb);
    }
    const modifiedOptions = _.cloneDeep(options);
    modifiedOptions.connectionOptions.resultConfig = {
      flatten: true,
    };
    this.config = modifiedOptions;
    this.client = new DachsHttpClient(this.config.connectionOptions, this.log.bind(this));
    this.warmWaterSensor = new DachsTemperatureSensor(this.config.roomName, 'ww', 'Water Temperature');
    this.heatStorageTempSensor = new DachsTemperatureSensor(this.config.roomName, 'hs', 'Heat Storage Temperature');
    Utils.guardedInterval(this.loadData, this.config.refreshInterval, this);
    this.blockAutomationHandler = new BlockAutomaticHandler(
      this.restoreTargetAutomaticValue.bind(this),
      this.log.bind(this),
    );
    if (Devices.energymanager?.deviceCapabilities?.includes(DeviceCapability.batteryDriven)) {
      const energyManager: iBaseDevice = Devices.energymanager as iBaseDevice;
      (energyManager as iBatteryDevice).battery.addBatteryLevelCallback(this.onBatteryLevelChange.bind(this));
    }
    this.warmWaterSensor.addTempChangeCallback(this.onWarmWaterTempChange.bind(this));
    this.heatStorageTempSensor.addTempChangeCallback(this.onHeatStorageTempChange.bind(this));
  }

  /** @inheritDoc */
  public get id(): string {
    return this.info.allDevicesKey ?? `dachs-${this.info.room}-${this.info.customName}`;
  }

  public get name(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public restoreTargetAutomaticValue(c: RestoreTargetAutomaticValueCommand): void {
    this.log(LogLevel.Debug, 'Restore Target Automatic value');
    this.setActuator(new ActuatorSetStateCommand(c, this.targetAutomaticState, 'Restore Target Automatic value'));
  }

  /** @inheritDoc */
  public persist(): void {
    Persistence.dbo?.persistActuator(this);
  }

  private loadData(): void {
    this.client
      .fetchAllKeys()
      .then((data) => {
        this.queuedValue = null;
        this.fetchedData = data;
        if (this._influxClient === undefined) {
          return;
        }
        for (const key in data) {
          const value = data[key as keyof iFlattenedCompleteResponse];
          if (typeof value === 'number') {
            this._influxClient.addMeasurementToQueue(key, value);
            continue;
          }
          this._influxClient.addMeasurementToQueue(key, value ? '1' : '0');
        }
        this._influxClient.flush();
        const isDachsOn = this.fetchedData!['Hka_Mw1.usDrehzahl'] >= 1;
        const didDachsChange = this._dachsOn !== isDachsOn;
        this._dachsOn = isDachsOn;
        this._dachsOn = this.fetchedData!['Hka_Mw1.usDrehzahl'] >= 1;
        this._tempWarmWater = this.fetchedData!['Hka_Mw1.Temp.sbZS_Warmwasser'] ?? 0;
        this.warmWaterSensor.update(this._tempWarmWater);
        this._tempHeatStorage = this.fetchedData!['Hka_Mw1.Temp.sbFuehler1'] ?? 0;
        this.heatStorageTempSensor.update(this._tempHeatStorage);
        if (didDachsChange) {
          this.onDachsRunningStateChange(new ActuatorChangeAction(this));
        }
        this.persist();
      })
      .catch((error) => {
        this.log(LogLevel.Error, `Error while fetching data: ${error}`, LogDebugType.DachsUnreach);
      });
  }

  /** @inheritDoc */
  public setActuator(c: ActuatorSetStateCommand): void {
    LampUtils.setActuator(this, c);
    if (
      !c.on ||
      !this.warmWaterPump ||
      (this.queuedValue === false && !this._dachsOn) ||
      this.settings.disableDachsOwnWW ||
      this.warmWaterDachsAlternativeActuator?.actuatorOn ||
      this.heatStorageTempSensor.temperatureSensor.temperature < this.warmWaterSensor.temperatureSensor.temperature ||
      this.warmWaterSensor.temperatureSensor.temperature > this.currentWarmWaterMaxTemp
    ) {
      return;
    }
    const startPumpCommand: ActuatorSetStateCommand = new ActuatorSetStateCommand(c, true, 'Dachs is starting/on');
    this.warmWaterPump.setActuator(startPumpCommand);
  }

  /** @inheritDoc */
  public toggleActuator(c: ActuatorToggleCommand): boolean {
    const setActuatorCommand: ActuatorSetStateCommand = new ActuatorSetStateCommand(
      c,
      this.queuedValue !== null ? !this.queuedValue : !this.actuatorOn,
      'Due to ActuatorToggle',
      c.isForceAction ? undefined : null,
    );
    this.setActuator(setActuatorCommand);
    return setActuatorCommand.on;
  }

  /** @inheritDoc */
  public writeActuatorStateToDevice(c: ActuatorWriteStateToDeviceCommand): void {
    this.logCommand(c, undefined, LogDebugType.SetActuator);
    if (!c.stateValue) {
      return;
    }
    this.client
      .setKeys({
        'Stromf_Ew.Anforderung_GLT.bAktiv': '1',
        'Stromf_Ew.Anforderung_GLT.bAnzahlModule': '1',
      })
      .then((response) => {
        this.log(LogLevel.Debug, `Dachs started resulted in status: ${response.status}, data: ${response.data}`);
        Utils.guardedTimeout(
          () => {
            this.client
              .setKeys({
                'Stromf_Ew.Anforderung_GLT.bAktiv': '0',
                'Stromf_Ew.Anforderung_GLT.bAnzahlModule': '0',
              })
              .catch((error) => {
                this.log(LogLevel.Error, `Error while turning off Dachs: ${error}`);
              });
          },
          30000,
          this,
        );
      })
      .catch((error) => {
        this.log(LogLevel.Error, `Error while turning on Dachs: ${error}`);
      });
  }

  /**
   * Reacts on level Changes of a Energymanager with battery
   * @param {BatteryLevelChangeAction} action - The action containing the new level
   */
  private onBatteryLevelChange(action: BatteryLevelChangeAction): void {
    this.checkAllDesiredStates(action, action.newLevel);
  }

  private checkAllDesiredStates(action: BaseAction, batteryLevel: number): void {
    if (this.blockAutomationHandler.automaticBlockActive) {
      return;
    }
    // Read, not refreshed. The plant's history belongs to the energy manager, which keeps it up to date on a
    // cadence of its own; asking here costs no query, so the decision may be taken as often as it likes.
    this._historyGateResult = this.evaluateHistoryGate();
    this.logHistoryGate(this._historyGateResult);
    const shouldDachsBeStarted: boolean = this.shouldDachsBeStarted(action, batteryLevel);
    this.checkHeatingRod(action, batteryLevel);
    this.checkAlternativeActuator(shouldDachsBeStarted, action);
    this.checkWwPumpDesiredState(action);
    if (!shouldDachsBeStarted) {
      return;
    }

    const setStateCommand: ActuatorSetStateCommand = new ActuatorSetStateCommand(
      action,
      true,
      'Energy Level of battery dropped to critical level',
      new BlockAutomaticCommand(
        action,
        15 * 60 * 1000,
        'Dachs is starting/on',
        CollisionSolving.overrideIfGreater,
        false,
      ),
    );
    setStateCommand.overrideCommandSource = CommandSource.Automatic;
    this.setActuator(setStateCommand);
  }

  /**
   * The state of charge of the plant's battery, as far as it is known.
   * @returns The level in percent, or {@link NO_STATE_OF_CHARGE} while there is no energy manager or it
   * carries no level - neither of which is a battery that is empty.
   */
  private static get currentStateOfCharge(): number {
    return (Devices.energymanager as unknown as iBatteryDevice)?.batteryLevel ?? NO_STATE_OF_CHARGE;
  }

  private onHeatStorageTempChange(action: TemperatureSensorChangeAction): void {
    this.checkAllDesiredStates(action, Dachs.currentStateOfCharge);
  }

  private onWarmWaterTempChange(action: TemperatureSensorChangeAction): void {
    this.checkAllDesiredStates(action, Dachs.currentStateOfCharge);
  }

  private checkWwPumpDesiredState(action: BaseAction): void {
    if (this.warmWaterPump === undefined) {
      // We have no control over the warm water pump --> nothing to do
      return;
    }

    const wwTemp: number = this._tempWarmWater;
    const heatStorageTemp: number = this._tempHeatStorage;
    let desiredWwPumpState: boolean = false;
    let reason: string = '';
    if (this.settings.disableDachsTemporarily) {
      reason = 'Dachs itself is disabled temporarily';
      desiredWwPumpState = false;
    } else if (this.settings.disableDachsOwnWW) {
      desiredWwPumpState = false;
      reason = 'Dachs own WW is disabled';
    } else if (this.warmWaterDachsAlternativeActuator?.actuatorOn === true) {
      desiredWwPumpState = false;
      reason = 'Alternative heating source is on';
    } else if (wwTemp > heatStorageTemp) {
      desiredWwPumpState = false;
      reason = `Temperature of warm water pump ${wwTemp}°C is higher than temperature of heat storage ${heatStorageTemp}°C`;
    } else if (wwTemp > this.currentWarmWaterMaxTemp) {
      desiredWwPumpState = false;
      reason = `Temperature of warm water pump ${wwTemp}°C is higher than the desired max value of ${this.currentWarmWaterMaxTemp}°C`;
    } else if (this._dachsOn) {
      desiredWwPumpState = true;
      reason = 'Dachs is on anyways';
    } else if (this.blockDachsStart?.actuatorOn === false) {
      desiredWwPumpState = true;
      reason = 'Dachs is not blocked --> lowering storage temp might trigger it.';
    } else if (wwTemp > this.settings.warmWaterDesiredMinTemp + 3) {
      desiredWwPumpState = false;
      reason = `Temperature of warm water pump ${wwTemp}°C is above desired minimum temperature ${this.settings.warmWaterDesiredMinTemp}°C`;
    } else if (heatStorageTemp < this.settings.warmWaterDesiredMinTemp - 4) {
      desiredWwPumpState = false;
      reason = `Temperature of heat storage ${heatStorageTemp}°C is too low to heat water.`;
    } else if (wwTemp < this.settings.warmWaterDesiredMinTemp) {
      desiredWwPumpState = true;
      reason = `Temperature of warm water pump ${wwTemp}°C is lower than desired minimum temperature ${this.settings.warmWaterDesiredMinTemp}°C`;
    } else {
      // We are somewhere between states, let's not change anything
      return;
    }
    if (desiredWwPumpState === this.warmWaterPump.actuatorOn) {
      // Nothing to do
      return;
    }
    const setAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(action, desiredWwPumpState, reason, null);
    this.warmWaterPump.setActuator(setAction);
  }

  private checkHeatingRod(action: BaseAction, batteryLevel: number): void {
    if (this.heatingRod === undefined) {
      return;
    }
    const shouldBeOff: boolean =
      this.settings.disableHeatingRod ||
      (batteryLevel < this.settings.batteryLevelHeatingRodThreshold &&
        !(
          SettingsService.heatMode === HeatingMode.Winter &&
          batteryLevel > this.settings.batteryLevelPreventStartThreshold &&
          this.heatStorageTempSensor.temperatureSensor.temperature < 60
        ));

    if (this.heatingRod.actuatorOn !== shouldBeOff) {
      return;
    }

    const setAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
      action,
      !shouldBeOff,
      `Battery reached ${batteryLevel}%, heating rod should be turned ${shouldBeOff ? 'off' : 'on'}`,
      null,
    );
    this.heatingRod.setActuator(setAction);
  }

  private shouldDachsBeStarted(action: BaseAction, batteryLevel: number): boolean {
    const dayType: TimeOfDay = TimeCallbackService.dayType(new SunTimeOffsets());
    /**
     * Set where the empty battery earns the release of the start block. Both the release and the block that
     * may take its place are written further down, behind the heat driven branches - a decision taken before
     * them could either swallow a heat driven start or leave the block standing while one happens.
     */
    let emptyBatteryEarnsRelease: boolean = false;
    if (this.blockDachsStart !== undefined) {
      if (this.settings.disableDachsTemporarily) {
        const blockAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
          action,
          true,
          `Dachs is disabled temporarily`,
          null,
        );
        blockAction.overrideCommandSource = CommandSource.Force;
        this.blockDachsStart.setActuator(blockAction);
        this._blockStarted = Utils.nowMS();
        return false;
      } else if (
        (dayType === TimeOfDay.Daylight || dayType === TimeOfDay.BeforeSunrise) &&
        batteryLevel > this.settings.batteryLevelPreventStartThreshold
      ) {
        const blockAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
          action,
          true,
          `Battery reached ${batteryLevel}%, Dachs should not run any more`,
          null,
        );
        blockAction.overrideCommandSource = CommandSource.Force;
        this.blockDachsStart.setActuator(blockAction);
        this._blockStarted = Utils.nowMS();
        return false;
      } else if (batteryLevel > this.settings.batteryLevelPreventStartAtNightThreshold) {
        const blockAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
          action,
          true,
          `Battery reached ${batteryLevel}%, Dachs should not run any more`,
          null,
        );
        blockAction.overrideCommandSource = CommandSource.Force;
        this.blockDachsStart.setActuator(blockAction);
        this._blockStarted = Utils.nowMS();
        return false;
      } else if (batteryLevel < this.settings.batteryLevelAllowStartThreshold) {
        // The empty battery earns a release here, but nothing is written yet: whether the release happens
        // or a block takes its place is decided behind the heat driven branches, so that neither outcome
        // can reach around a heat driven start.
        emptyBatteryEarnsRelease = true;
      } else if (
        Utils.nowMS() - this._blockStarted > 3 * 60 * 60 * 1000 &&
        (SettingsService.settings.heaterSettings?.mode === HeatingMode.Winter ||
          this.warmWaterDachsAlternativeActuator === undefined)
      ) {
        const liftAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
          action,
          false,
          `Battery is at ${batteryLevel}%, but Dachs wasn't allowed to run for 3 hours, Dachs is now allowed to run if needed`,
          null,
        );
        this.blockDachsStart.setActuator(liftAction);
      } else if (
        SettingsService.settings.heaterSettings?.mode === HeatingMode.Winter &&
        this.heatStorageTempSensor.temperatureSensor.temperature < this.settings.winterMinimumPreNightHeatStorageTemp &&
        Utils.dateByTimeSpan(21, 30) < new Date()
      ) {
        const liftWinterAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
          action,
          false,
          `Battery at ${batteryLevel}% but it is winter, we are nearing night and heat storage is kinda cold: Dachs is now allowed to run if needed`,
          null,
        );
        this.blockDachsStart.setActuator(liftWinterAction);
      } else if (this.blockDachsStart.actuatorOn) {
        // We haven't reached the lower threshold yet --> nothing to do
        return false;
      }
    }
    const alreadyRunning: boolean = this._dachsOn;
    // The heat driven decision is taken but not returned yet, so that the block actuator below is written
    // with it already known.
    let heatDrivenStart: boolean | undefined = undefined;
    if (!alreadyRunning) {
      if (
        SettingsService.settings.heaterSettings?.mode === HeatingMode.Winter &&
        this.heatStorageTempSensor.temperatureSensor.temperature < this.settings.winterMinimumHeatStorageTemp
      ) {
        // It is winter and heat storage is kinda cold --> Start
        heatDrivenStart = true;
      } else if (this.heatStorageTempSensor.temperatureSensor.temperature > this.settings.heatStorageMaxStartTemp) {
        // Heat Storage is already quite full, don't start
        heatDrivenStart = false;
      }
    }

    // Everything above is heat driven and stays untouched; from here on the decision is electricity driven,
    // which is the only branch the history gate speaks about. The gate is read - and the block actuator
    // written - only at this point, so neither of its two directions can reach around a heat driven decision.
    const gate: iDachsHistoryGateResult | undefined = this._historyGateResult;
    const gateSuppresses: boolean = heatDrivenStart === undefined && gate?.suppress === true;
    if (emptyBatteryEarnsRelease && this.blockDachsStart !== undefined) {
      if (gateSuppresses) {
        const gateBlockAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
          action,
          true,
          `History gate suppresses the start - ${gate?.reason}`,
          null,
        );
        gateBlockAction.overrideCommandSource = CommandSource.Force;
        this.blockDachsStart.setActuator(gateBlockAction);
        this._blockStarted = Utils.nowMS();
      } else {
        const liftAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
          action,
          false,
          `Battery reached ${batteryLevel}%, Dachs is now allowed to run if needed`,
          null,
        );
        this.blockDachsStart.setActuator(liftAction);
      }
    }

    if (alreadyRunning) {
      // We are already running
      return false;
    }
    if (heatDrivenStart !== undefined) {
      return heatDrivenStart;
    }
    if (gate?.request === true) {
      return true;
    }
    if (gateSuppresses) {
      return false;
    }

    if (
      (dayType === TimeOfDay.Daylight || dayType === TimeOfDay.BeforeSunrise) &&
      batteryLevel > this.settings.batteryLevelTurnOnThreshold
    ) {
      // It is daytime (maybe solar power) and it is no critical battery level
      return false;
    }

    if (batteryLevel > this.settings.batteryLevelBeforeNightTurnOnThreshold) {
      // It is not daylight but battery level is high enough
      return false;
    }
    return !this.settings.blockAutomaticSettings;
  }

  /**
   * What this unit makes of what the plant said about the coming morning.
   *
   * Its own question comes first and is the only one it answers itself: while the warm water sits below the
   * minimum the unit is needed for heat, so energy does not decide and the plant's verdict is recorded without
   * being acted on. Everything below that is translation - the plant judged whether the morning holds, this
   * unit only says what it does about it.
   *
   * **A verdict the plant reached without its fitted model may move something, a modelled one may not.** The
   * measured verdicts are arithmetic on the plant's own recorded consumption and carry no unmeasured
   * assumption; the modelled one rests on a fit whose window length has never been checked against recorded
   * data. Stage 4 therefore names which side of the reserve the band fell on and moves nothing - behaviourally
   * the same as stage 5 and distinguishable from it only by the reason line. Whether the model beats the
   * trivial rule is measured once, by the energy manager, over the plant's single shadow record.
   *
   * The stage numbers are this unit's log vocabulary rather than the plant's ladder: stage 1 is the warm water
   * question nobody else has, stages 2 and 3 are the measured verdicts it acts on, stage 4 the modelled one it
   * only reports, stage 5 no verdict at all.
   * @returns The decision, or undefined while the heating mode is winter or the plant says nothing about the
   * coming morning.
   */
  private evaluateHistoryGate(): iDachsHistoryGateResult | undefined {
    if (SettingsService.settings.heaterSettings?.mode === HeatingMode.Winter) {
      // During winter operation the heat demand decides when the unit runs, so the gate stays out of it.
      return undefined;
    }
    // An absent verdict covers the installation without an energy manager, the one whose battery reports no
    // charge level and the one whose manager states no reserve to judge against. The unit does not tell them
    // apart: in none of them is there a judgement to act on, and the stock ladder below then decides as it did
    // before the gate existed. Not logged here either - the plant already says why it stays silent, and this
    // runs on every battery and temperature update.
    const verdict: iMorningReserveVerdict | undefined = Devices.energymanager?.morningReserveVerdict;
    if (verdict === undefined) {
      return undefined;
    }
    this._historyGateEvaluations++;
    if (verdict.modelFitted) {
      this._historyGateStatements++;
    }

    const warmWater: number = this.warmWaterSensor.temperatureSensor.temperature;
    if (warmWater < this.settings.warmWaterDesiredMinTemp) {
      // The band of a verdict that was not acted on would read as though it had been; the line collapses onto
      // the charge level instead, which is what "energy did not decide this" looks like in the log.
      return Dachs.gateResult(
        1,
        false,
        false,
        `warm water ${warmWater}°C is below the minimum ${this.settings.warmWaterDesiredMinTemp}°C`,
        verdict,
        verdict.currentSoc,
        verdict.currentSoc,
      );
    }
    if (verdict.holds === undefined) {
      return Dachs.gateResult(5, false, false, verdict.reason, verdict, verdict.band.lower, verdict.band.upper);
    }
    if (!verdict.measured) {
      return Dachs.gateResult(
        4,
        false,
        false,
        `${verdict.reason}, which this unit does not act on`,
        verdict,
        verdict.band.lower,
        verdict.band.upper,
      );
    }
    return verdict.holds
      ? Dachs.gateResult(2, true, false, verdict.reason, verdict, verdict.band.lower, verdict.band.upper)
      : Dachs.gateResult(3, false, true, verdict.reason, verdict, verdict.band.lower, verdict.band.upper);
  }

  /**
   * Assembles a gate result and the reason line the operator reads it by.
   * @param stage - The stage of this unit's own vocabulary that decided.
   * @param suppress - Whether the electricity driven start is suppressed.
   * @param request - Whether a start is asked for.
   * @param detail - What the plant said, or what this unit answered instead.
   * @param verdict - The plant's verdict, for the numbers the line is read by.
   * @param lowerEdgeSoc - The projected morning charge level at the lower edge.
   * @param upperEdgeSoc - The projected morning charge level at the upper edge.
   * @returns The decision.
   */
  private static gateResult(
    stage: number,
    suppress: boolean,
    request: boolean,
    detail: string,
    verdict: iMorningReserveVerdict,
    lowerEdgeSoc: number,
    upperEdgeSoc: number,
  ): iDachsHistoryGateResult {
    return {
      suppress,
      request,
      reason:
        `Stage ${stage}: ${detail} (soc ${Utils.round(verdict.currentSoc, 2)}%, band ` +
        `${Utils.round(lowerEdgeSoc, 2)}%..${Utils.round(upperEdgeSoc, 2)}%, reserve ${verdict.reserve}%, ` +
        `${verdict.sampleDays} days)`,
      currentSoc: verdict.currentSoc,
      lowerEdgeSoc,
      upperEdgeSoc,
      reserve: verdict.reserve,
      sampleDays: verdict.sampleDays,
    };
  }

  /**
   * Writes the gate decision to the log - on info whenever the decision changed, on debug otherwise, as the
   * evaluation runs on every battery and temperature update.
   * @param result - The decision to log, if there is one.
   */
  private logHistoryGate(result: iDachsHistoryGateResult | undefined): void {
    if (result === undefined) {
      return;
    }
    const decision: string = `${result.suppress}/${result.request}`;
    const changed: boolean = decision !== this._lastGateDecision;
    this._lastGateDecision = decision;
    this.log(
      changed ? LogLevel.Info : LogLevel.Debug,
      `History gate: ${result.reason}; a statement was possible in ${this._historyGateStatements} of ` +
        `${this._historyGateEvaluations} evaluations`,
    );
  }

  private checkAlternativeActuator(shouldDachsBeStarted: boolean, action: BaseAction): void {
    if (!this.warmWaterDachsAlternativeActuator) {
      return;
    }
    let desiredState: boolean = false;
    let reason: string = 'Dachs is allowed to run --> Block alternative heating source';

    if (this.settings.disableDachsTemporarily) {
      reason = 'Dachs itself is disabled temporarily';
      desiredState = true;
    } else if (this.settings.disableDachsOwnWW) {
      reason = 'Dachs own WW is disabled';
      desiredState = true;
    } else if (shouldDachsBeStarted || this._dachsOn) {
      reason = 'Dachs is running or should be started';
      desiredState = false;
    } else if (this.blockDachsStart?.actuatorOn === true || this.blockDachsStart?.queuedValue === true) {
      reason = 'Dachs is blocked --> Allow Alternative Heating Source';
      desiredState = true;
    }

    if (this.warmWaterDachsAlternativeActuator.actuatorOn === desiredState) {
      return;
    }

    const command: ActuatorSetStateCommand = new ActuatorSetStateCommand(action, desiredState, reason, null);
    command.overrideCommandSource = CommandSource.Force;
    this.warmWaterDachsAlternativeActuator.setActuator(command);
  }

  private onDachsRunningStateChange(runStateChange: ActuatorChangeAction): void {
    this.checkAllDesiredStates(runStateChange, Dachs.currentStateOfCharge);
  }
}
