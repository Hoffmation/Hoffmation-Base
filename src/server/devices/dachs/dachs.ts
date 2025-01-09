import {
  DeviceCapability,
  DeviceInfo,
  Devices,
  DeviceType,
  iActuator,
  iBaseDevice,
  iBatteryDevice,
  LampUtils,
} from '../../devices/index.js';
import {
  ActuatorChangeAction,
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  BaseAction,
  BatteryLevelChangeAction,
  CommandSource,
  LogLevel,
  RestoreTargetAutomaticValueCommand,
  RoomBase,
  TemperatureSensorChangeAction,
  TimeOfDay,
} from '../../../models/index.js';
import {
  API,
  LogDebugType,
  OwnSonosDevice,
  ServerLogService,
  SettingsService,
  SunTimeOffsets,
  TimeCallbackService,
  Utils,
} from '../../services/index.js';
import _ from 'lodash';
import { iDachsSettings } from '../../config/iDachsSettings.js';
import { DachsDeviceSettings } from '../../../models/deviceSettings/dachsSettings.js';
import { DachsTemperatureSensor } from './dachsTemperatureSensor.js';
import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler.js';
import { HeatingMode } from '../../config/index.js';
import { DachsHttpClient, DachsInfluxClient } from './lib/index.js';
import { iFlattenedCompleteResponse } from './interfaces/index.js';

export class Dachs implements iBaseDevice, iActuator {
  /** @inheritDoc */
  public settings: DachsDeviceSettings = new DachsDeviceSettings();
  /** @inheritDoc */
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  /** @inheritDoc */
  public readonly deviceType: DeviceType = DeviceType.Dachs;
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

  /** @inheritDoc */
  public get customName(): string {
    return this.info.customName;
  }

  /** @inheritDoc */
  public get actuatorOn(): boolean {
    return this._dachsOn;
  }

  public constructor(options: iDachsSettings) {
    this.deviceCapabilities.push(DeviceCapability.actuator);
    this._info = new DeviceInfo();
    this._info.fullName = 'Dachs';
    this._info.customName = `Dachs ${options.roomName}`;
    this._info.allDevicesKey = `dachs-${options.roomName}`;
    this._info.room = options.roomName;
    Devices.alLDevices[this._info.allDevicesKey] = this;
    if (options.influxDb) {
      this._influxClient = new DachsInfluxClient(options.influxDb);
    }
    this.persistDeviceInfo();
    this.loadDeviceSettings();
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
  public get info(): DeviceInfo {
    return this._info;
  }

  protected _info: DeviceInfo;

  /** @inheritDoc */
  public get id(): string {
    return this.info.allDevicesKey ?? `sonos-${this.info.room}-${this.info.customName}`;
  }

  /** @inheritDoc */
  public get room(): RoomBase | undefined {
    return API.getRoom(this.info.room);
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
  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      deviceId: this.name,
      room: this._info.room,
      deviceName: this.name,
    });
  }

  /** @inheritDoc */
  public toJSON(): Partial<OwnSonosDevice> {
    return Utils.jsonFilter(
      _.omit(this, [
        'room',
        'client',
        'config',
        '_influxClient',
        'warmWaterSensor',
        'heatStorageTempSensor',
        'warmWaterPump',
        'heatingRod',
        'blockDachsStart',
        'warmWaterDachsAlternativeActuator',
      ]),
    );
  }

  /** @inheritDoc */
  public persistDeviceInfo(): void {
    Utils.guardedTimeout(
      () => {
        Utils.dbo?.addDevice(this);
      },
      5000,
      this,
    );
  }

  /** @inheritDoc */
  public loadDeviceSettings(): void {
    this.settings.initializeFromDb(this);
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
  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }

  /** @inheritDoc */
  public setActuator(c: ActuatorSetStateCommand): void {
    LampUtils.setActuator(this, c);
    if (
      !c.on ||
      !this.warmWaterPump ||
      (this.queuedValue === false && !this._dachsOn) ||
      this.heatStorageTempSensor.temperatureSensor.temperature < this.warmWaterSensor.temperatureSensor.temperature
    ) {
      return;
    }
    const startPumpCommand: ActuatorSetStateCommand = new ActuatorSetStateCommand(c, true, 'Dachs is starting/on');
    this.warmWaterPump.setActuator(startPumpCommand);
  }

  /** @inheritDoc */
  public toggleActuator(c: ActuatorToggleCommand): boolean {
    const setActuatorCommand: ActuatorSetStateCommand = ActuatorSetStateCommand.byActuatorAndToggleCommand(this, c);
    this.setActuator(setActuatorCommand);
    return setActuatorCommand.on;
  }

  /** @inheritDoc */
  public writeActuatorStateToDevice(c: ActuatorWriteStateToDeviceCommand): void {
    this.log(LogLevel.Debug, c.logMessage, LogDebugType.SetActuator);
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
      null,
    );
    setStateCommand.overrideCommandSource = CommandSource.Force;
    this.setActuator(setStateCommand);
  }

  private onHeatStorageTempChange(action: TemperatureSensorChangeAction): void {
    this.checkAllDesiredStates(action, (Devices.energymanager as unknown as iBatteryDevice)?.batteryLevel ?? 0);
  }

  private onWarmWaterTempChange(action: TemperatureSensorChangeAction): void {
    this.checkAllDesiredStates(action, (Devices.energymanager as unknown as iBatteryDevice)?.batteryLevel ?? 0);
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
    if (this.warmWaterDachsAlternativeActuator?.actuatorOn === true) {
      desiredWwPumpState = false;
      reason = 'Alternative heating source is on';
    } else if (wwTemp > heatStorageTemp) {
      desiredWwPumpState = false;
      reason = `Temperature of warm water pump ${wwTemp}°C is higher than temperature of heat storage ${heatStorageTemp}°C`;
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
    const shouldBeOff: boolean = batteryLevel < this.settings.batteryLevelHeatingRodThreshold;

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
    if (this.blockDachsStart !== undefined) {
      if (batteryLevel > this.settings.batteryLevelPreventStartThreshold) {
        const blockAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
          action,
          true,
          `Battery reached ${batteryLevel}%, Dachs should not run any more`,
          null,
        );
        blockAction.overrideCommandSource = CommandSource.Force;
        this.blockDachsStart.setActuator(blockAction);
        return false;
      } else if (batteryLevel < this.settings.batteryLevelAllowStartThreshold) {
        const liftAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
          action,
          false,
          `Battery reached ${batteryLevel}%, Dachs is now allowed to run if needed`,
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
    if (this._dachsOn) {
      // We are already running
      return false;
    }

    if (
      SettingsService.settings.heaterSettings?.mode === HeatingMode.Winter &&
      this.heatStorageTempSensor.temperatureSensor.temperature < this.settings.winterMinimumHeatStorageTemp
    ) {
      // It is winter and heat storage is kinda cold --> Start
      return true;
    }

    const dayType: TimeOfDay = TimeCallbackService.dayType(new SunTimeOffsets());

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
    return true;
  }

  private checkAlternativeActuator(shouldDachsBeStarted: boolean, action: BaseAction): void {
    if (!this.warmWaterDachsAlternativeActuator) {
      return;
    }
    let desiredState: boolean = false;
    let reason: string = 'Dachs is allowed to run --> Block alternative heating source';
    if (shouldDachsBeStarted || this._dachsOn) {
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
    this.checkAllDesiredStates(runStateChange, (Devices.energymanager as unknown as iBatteryDevice)?.batteryLevel ?? 0);
  }
}
