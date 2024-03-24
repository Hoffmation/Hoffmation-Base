import { DeviceInfo, Devices, DeviceType, iActuator, iBaseDevice, LampUtils } from '../../devices';
import {
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  LogLevel,
  RestoreTargetAutomaticValueCommand,
  RoomBase,
} from '../../../models';
import { DeviceCapability } from '../DeviceCapability';
import { API, LogDebugType, OwnSonosDevice, ServerLogService, Utils } from '../../services';
import _ from 'lodash';
import { iDachsSettings } from '../../config/iDachsSettings';
import { DachsDeviceSettings } from '../../../models/deviceSettings/dachsSettings';
import { DachsHttpClient, DachsInfluxClient } from './lib';
import { iFlattenedCompleteResponse } from './interfaces';
import { DachsTemperatureSensor } from './dachsTemperatureSensor';
import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler';

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
    this.client = new DachsHttpClient(this.config.connectionOptions);
    this.warmWaterSensor = new DachsTemperatureSensor(this.config.roomName, 'ww', 'Water Temperature');
    this.heatStorageTempSensor = new DachsTemperatureSensor(this.config.roomName, 'hs', 'Heat Storage Temperature');
    Utils.guardedInterval(this.loadData, this.config.refreshInterval, this);
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
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
      _.omit(this, ['room', 'client', 'config', '_influxClient', 'warmWaterSensor', 'heatStorageTempSensor']),
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
        this.log(LogLevel.Error, `Error while fetching data: ${error}`);
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
}
