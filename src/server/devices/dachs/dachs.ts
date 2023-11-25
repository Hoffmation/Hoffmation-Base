import { DeviceInfo, Devices, DeviceType, iActuator, iBaseDevice, LampUtils } from '../../devices';
import { CollisionSolving, LogLevel, RoomBase } from '../../../models';
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
  public settings: DachsDeviceSettings = new DachsDeviceSettings();
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  public readonly deviceType: DeviceType = DeviceType.Dachs;
  public readonly deviceCapabilities: DeviceCapability[] = [];
  public readonly warmWaterSensor: DachsTemperatureSensor;
  public readonly heatStorageTempSensor: DachsTemperatureSensor;
  private readonly client: DachsHttpClient;
  private readonly config: iDachsSettings;
  public fetchedData: iFlattenedCompleteResponse | undefined;
  public queuedValue: boolean | null = null;
  private readonly _influxClient: DachsInfluxClient | undefined;
  private _dachsOn: boolean = false;
  private _tempWarmWater: number = 0;
  private _tempHeatStorage: number = 0;
  public targetAutomaticState: boolean = false;

  public get customName(): string {
    return this.info.customName;
  }

  public get actuatorOn(): boolean {
    return this._dachsOn;
  }

  public get tempWarmWater(): number {
    return this._tempWarmWater;
  }

  public get tempHeatStorage(): number {
    return this._tempHeatStorage;
  }

  public constructor(options: iDachsSettings) {
    this.deviceCapabilities.push(DeviceCapability.actuator);
    this._info = new DeviceInfo();
    this._info.fullName = `Dachs`;
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

  public restoreTargetAutomaticValue(): void {
    this.log(LogLevel.Debug, `Restore Target Automatic value`);
    this.setActuator(this.targetAutomaticState);
  }

  protected _info: DeviceInfo;

  public get info(): DeviceInfo {
    return this._info;
  }

  public set info(info: DeviceInfo) {
    this._info = info;
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `sonos-${this.info.room}-${this.info.customName}`;
  }

  public get name(): string {
    return this.info.customName;
  }

  public get room(): RoomBase | undefined {
    return API.getRoom(this.info.room);
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      deviceId: this.name,
      room: this._info.room,
      deviceName: this.name,
    });
  }

  public toJSON(): Partial<OwnSonosDevice> {
    return Utils.jsonFilter(
      _.omit(this, ['room', 'client', 'config', '_influxClient', 'warmWaterSensor', 'heatStorageTempSensor']),
    );
  }

  public persistDeviceInfo(): void {
    Utils.guardedTimeout(
      () => {
        Utils.dbo?.addDevice(this);
      },
      5000,
      this,
    );
  }

  public loadDeviceSettings(): void {
    this.settings.initializeFromDb(this);
  }

  private loadData(): void {
    this.client.fetchAllKeys().then((data) => {
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
    });
  }

  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }

  public setActuator(pValue: boolean, timeout?: number, force?: boolean): void {
    if (!pValue || this._dachsOn) {
      // Dachs can only be turned on, not off
      return;
    }

    const dontBlock: boolean = LampUtils.checkUnBlock(this, force, pValue);

    if (LampUtils.checkBlockActive(this, force, pValue)) {
      return;
    }

    this.log(LogLevel.Debug, `Starting Dachs`);
    this.queuedValue = pValue;
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

    if (timeout !== undefined && timeout > -1 && !dontBlock) {
      this.blockAutomationHandler.disableAutomatic(timeout, CollisionSolving.overrideIfGreater);
    }
  }

  public toggleActuator(_force: boolean): boolean {
    if (!this._dachsOn) {
      this.setActuator(true);
      return true;
    }
    return false;
  }
}
