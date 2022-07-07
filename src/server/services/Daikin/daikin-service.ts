import { DaikinAC, DaikinManager } from 'daikin-controller';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';
import { OwnDaikinDevice } from './own-daikin-device';

export class DaikinService {
  private static _ownDevices: { [name: string]: OwnDaikinDevice } = {};

  private static _daikinManager: DaikinManager;

  public static get daikinManager(): DaikinManager {
    return this._daikinManager;
  }

  private static _isInitialized: boolean;

  public static get isInitialized(): boolean {
    return this._isInitialized;
  }

  public static addOwnDevices(daikinDevices: { [name: string]: OwnDaikinDevice }): void {
    this._ownDevices = daikinDevices;
  }

  public static getDevice(name: string): DaikinAC | undefined {
    return this.daikinManager.devices[name];
  }

  public static async initialize(): Promise<void> {
    const devices: { [name: string]: string } = {};
    for (const ownDevicesKey in this._ownDevices) {
      devices[ownDevicesKey] = this._ownDevices[ownDevicesKey].ip;
    }
    return new Promise((res, _rej) => {
      this._daikinManager = new DaikinManager({
        addDevicesByDiscovery: false,
        deviceList: devices,
        deviceDiscoveryWaitCount: 3,
        logInitialDeviceConnection: true,
        useGetToPost: false,
        initializeCB: (message) => {
          ServerLogService.writeLog(LogLevel.Debug, `Connected Daikin Devices resolved with "${message}"`);
          this._isInitialized = true;
          for (const ownDevicesKey in this.daikinManager.devices) {
            this.initializeDevice(this.daikinManager.devices[ownDevicesKey], ownDevicesKey);
          }
          res();
        },
      });
    });
  }

  private static initializeDevice(d: DaikinAC, name: string): void {
    if (this._ownDevices[name] === undefined) {
      ServerLogService.writeLog(LogLevel.Alert, `Unbekanntes Daikin Gerät "${name}"`);
      return;
    }
    this._ownDevices[name].device = d;
    ServerLogService.writeLog(LogLevel.Debug, `Daikin ${name} gefunden`);
  }
}
