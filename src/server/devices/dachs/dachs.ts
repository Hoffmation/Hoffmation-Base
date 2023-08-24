import { DeviceInfo, Devices, DeviceType, iBaseDevice } from '../../devices';
import { LogLevel } from '../../../models';
import { DeviceCapability } from '../DeviceCapability';
import { LogDebugType, OwnSonosDevice, ServerLogService, Utils } from '../../services';
import _ from 'lodash';
import { iDachsSettings } from '../../config/iDachsSettings';
import { DachsDeviceSettings } from '../../../models/deviceSettings/dachsSettings';
import { DachsHttpClient, DachsInfluxClient } from './lib';
import { iFlattenedCompleteResponse } from './interfaces';

export class Dachs implements iBaseDevice {
  public settings: DachsDeviceSettings = new DachsDeviceSettings();
  public readonly deviceType: DeviceType = DeviceType.Dachs;
  public readonly deviceCapabilities: DeviceCapability[] = [];
  private readonly client: DachsHttpClient;
  private readonly config: iDachsSettings;
  public fetchedData: iFlattenedCompleteResponse | undefined;
  private readonly _influxClient: DachsInfluxClient | undefined;

  public get customName(): string {
    return this.info.customName;
  }

  public constructor(options: iDachsSettings) {
    this._info = new DeviceInfo();
    this._info.fullName = `Dachs`;
    this._info.customName = `Dachs`;
    this._info.allDevicesKey = `dachs`;
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
    Utils.guardedInterval(this.loadData, this.config.refreshInterval, this);
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

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  public toJSON(): Partial<OwnSonosDevice> {
    return Utils.jsonFilter(_.omit(this, ['room', 'client', 'config', '_influxClient']));
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
    });
  }
}
