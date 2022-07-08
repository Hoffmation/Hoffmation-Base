import { DaikinAC, DaikinManager } from 'daikin-controller';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';
import { OwnDaikinDevice } from './own-daikin-device';
import { TelegramMessageCallback, TelegramService } from '../Telegram';
import TelegramBot from 'node-telegram-bot-api';

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
    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'AcOn',
        /\/ac_on/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          DaikinService.setAll(true);
          TelegramService.sendMessage([m.from.id], 'Command executed');
          return true;
        },
        `Turns all Ac's on without changing any settings`,
      ),
    );
    TelegramService.addMessageCallback(
      new TelegramMessageCallback(
        'AcOff',
        /\/ac_off/,
        async (m: TelegramBot.Message): Promise<boolean> => {
          if (m.from === undefined) return false;
          DaikinService.setAll(false);
          TelegramService.sendMessage([m.from.id], 'Command executed');
          return true;
        },
        `Turns all Ac's off without changing any settings`,
      ),
    );
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

  public static setAll(on: boolean): void {
    for (const deviceName in this._daikinManager.devices) {
      const dev: DaikinAC = this._daikinManager.devices[deviceName];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      dev.setACControlInfo({ power: on }, (err, res) => {
        if (!res) {
          ServerLogService.writeLog(LogLevel.Warn, `Setting Ac Info for ${deviceName} failed:  ${err} `);
          return;
        } else {
          ServerLogService.writeLog(LogLevel.Info, `Switching Ac ${deviceName} to ${on ? 'on' : 'off'} was successful`);
        }
      });
    }
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
