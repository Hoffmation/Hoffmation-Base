import {
  DeviceCapability,
  DeviceInfo,
  Devices,
  DeviceType,
  iActuator,
  iBaseDevice,
  iBatteryDevice,
  LampUtils,
} from '../../devices';
import {
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  BatteryLevelChangeAction,
  CommandSource,
  LogLevel,
  RestoreTargetAutomaticValueCommand,
  RoomBase,
  TemperatureSensorChangeAction,
  TimeOfDay,
} from '../../../models';
import {
  API,
  LogDebugType,
  OwnSonosDevice,
  ServerLogService,
  SettingsService,
  SunTimeOffsets,
  TimeCallbackService,
  Utils,
} from '../../services';
import _ from 'lodash';
import { iDachsSettings } from '../../config/iDachsSettings';
import { DachsDeviceSettings } from '../../../models/deviceSettings/dachsSettings';
import { DachsHttpClient, DachsInfluxClient } from './lib';
import { iFlattenedCompleteResponse } from './interfaces';
import { DachsTemperatureSensor } from './dachsTemperatureSensor';
import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler';
import { HeatingMode } from '../../config';

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
      (energyManager as iBatteryDevice).addBatteryLevelCallback(this.onBatteryLevelChange.bind(this));
    }
    this.warmWaterSensor.addTempChangeCallback(this.onTempChange.bind(this));
    this.heatStorageTempSensor.addTempChangeCallback(this.onTempChange.bind(this));
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
        this._dachsOn = this.fetchedData['Hka_Mw1.usDrehzahl'] >= 1;
        this._tempWarmWater = this.fetchedData['Hka_Mw1.Temp.sbZS_Warmwasser'] ?? 0;
        this.warmWaterSensor.update(this._tempWarmWater);
        this._tempHeatStorage = this.fetchedData['Hka_Mw1.Temp.sbFuehler1'] ?? 0;
        this.heatStorageTempSensor.update(this._tempHeatStorage);
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
    this.checkHeatingRod(action);
    if (this.blockDachsStart !== undefined) {
      if (action.newLevel > this.settings.batteryLevelPreventStartThreshold) {
        const blockAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
          action,
          true,
          `Battery reached ${action.newLevel}%, Dachs should not run any more`,
          null,
        );
        blockAction.overrideCommandSource = CommandSource.Force;
        this.blockDachsStart.setActuator(blockAction);
        return;
      } else if (action.newLevel < this.settings.batteryLevelAllowStartThreshold) {
        const liftAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
          action,
          false,
          `Battery reached ${action.newLevel}%, Dachs is now allowed to run if needed`,
          null,
        );
        this.blockDachsStart.setActuator(liftAction);
      } else if (this.blockDachsStart.actuatorOn) {
        // We haven't reached the lower threshold yet --> nothing to do
        return;
      }
    }
    if (this._dachsOn) {
      // We are already running
      return;
    }

    const dayType: TimeOfDay = TimeCallbackService.dayType(new SunTimeOffsets());

    if (
      (dayType === TimeOfDay.Daylight || dayType === TimeOfDay.BeforeSunrise) &&
      action.newLevel > this.settings.batteryLevelTurnOnThreshold
    ) {
      // It is daytime (maybe solar power) and it is no critical battery level
      return;
    }

    if (action.newLevel > this.settings.batteryLevelBeforeNightTurnOnThreshold) {
      // It is not daylight but battery level is high enough
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

  private onTempChange(action: TemperatureSensorChangeAction): void {
    if (this.warmWaterPump === undefined) {
      // We have no control over the warm water pump --> nothing to do
      return;
    }

    const wwTemp: number = this._tempWarmWater;
    const heatStorageTemp: number = this._tempHeatStorage;
    let desiredState: boolean = false;
    let reason: string = '';
    if (wwTemp > this.settings.warmWaterDesiredMinTemp + 3) {
      desiredState = false;
      reason = `Temperature of warm water pump ${wwTemp}°C is above desired minimum temperature ${this.settings.warmWaterDesiredMinTemp}°C`;
    } else if (wwTemp > heatStorageTemp) {
      desiredState = false;
      reason = `Temperature of warm water pump ${wwTemp}°C is higher than temperature of heat storage ${heatStorageTemp}°C`;
    } else if (heatStorageTemp < this.settings.warmWaterDesiredMinTemp - 4) {
      desiredState = false;
      reason = `Temperature of heat storage ${heatStorageTemp}°C is too low to heat water.`;
    } else if (wwTemp < this.settings.warmWaterDesiredMinTemp) {
      desiredState = true;
      reason = `Temperature of warm water pump ${wwTemp}°C is lower than desired minimum temperature ${this.settings.warmWaterDesiredMinTemp}°C`;
    } else {
      // We are somewhere between states, let's not change anything
      return;
    }
    if (desiredState === this.warmWaterPump.actuatorOn) {
      // Nothing to do
      return;
    }
    const setAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(action, desiredState, reason, null);
    this.warmWaterPump.setActuator(setAction);
  }

  private checkHeatingRod(action: BatteryLevelChangeAction): void {
    if (this.heatingRod === undefined) {
      return;
    }
    const shouldBeOff: boolean =
      SettingsService.settings.heaterSettings?.mode === HeatingMode.Winter ||
      action.newLevel < this.settings.batteryLevelHeatingRodThreshold;

    if (this.heatingRod.actuatorOn !== shouldBeOff) {
      return;
    }

    const setAction: ActuatorSetStateCommand = new ActuatorSetStateCommand(
      action,
      !shouldBeOff,
      `Battery reached ${action.newLevel}%, heating rod should be turned ${shouldBeOff ? 'off' : 'on'}`,
      null,
    );
    this.heatingRod.setActuator(setAction);
  }
}
