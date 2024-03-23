import { DaikinAC, DaikinManager } from 'daikin-controller';
import { ServerLogService } from '../log-service';
import { AutomaticBlockDisableCommand, CommandSource, LogLevel } from '../../../models';
import { OwnDaikinDevice } from './own-daikin-device';
import { TelegramMessageCallback, TelegramService } from '../Telegram';
import TelegramBot from 'node-telegram-bot-api';
import { SettingsService } from '../settings-service';
import { Devices } from '../../devices';
import { Router } from '../network';
import { Utils } from '../utils';
import { AcDevice } from './ac-device';
import { AcDeviceType } from './acDeviceType';

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

  public static addOwnDevices(daikinDevices: { [name: string]: AcDevice }): void {
    const toAdd: { [name: string]: OwnDaikinDevice } = {};
    for (const name in daikinDevices) {
      const d = daikinDevices[name];
      if (d.acDeviceType == AcDeviceType.Daikin) {
        toAdd[name] = d as OwnDaikinDevice;
      }
    }
    this._ownDevices = toAdd;
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
          TelegramService.sendMessage([m.chat.id], 'Command executed');
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
          DaikinService.setAll(false, true);
          TelegramService.sendMessage([m.chat.id], 'Command executed');
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
        useGetToPost: SettingsService.settings.daikin?.useGetToPost ?? false,
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

  // TODO: Migrate to new command system
  public static setAll(on: boolean, force: boolean = false): void {
    if (!this.isInitialized) {
      return;
    }
    for (const deviceName in this._ownDevices) {
      const dev: OwnDaikinDevice = this._ownDevices[deviceName];
      if (on) {
        dev.turnOn();
      } else {
        dev.turnOff();
      }
      if (force) {
        dev.blockAutomationHandler.disableAutomatic(
          new AutomaticBlockDisableCommand(CommandSource.Unknown, 180 * 60 * 1000),
        );
      }
    }
  }

  public static async reconnect(name: string, ip: string, mac?: string): Promise<DaikinAC | undefined> {
    ServerLogService.writeLog(LogLevel.Debug, `Reconnecting Daikin AC "${name}"`);
    const router: Router | undefined = Router.getRouter();
    if (router === undefined) {
      return this.reconstructDaikinAc(ip, name);
    }
    if (mac !== undefined) {
      await router.reconnectDeviceByMac(mac);
    } else {
      await router.reconnectDeviceByIp(ip);
    }
    await Utils.delay(5000);
    return this.reconstructDaikinAc(ip, name);
  }

  private static reconstructDaikinAc(ip: string, name: string): DaikinAC | undefined {
    const d = new DaikinAC(
      ip,
      { useGetToPost: SettingsService.settings.daikin?.useGetToPost ?? false },
      (_error, _info) => {
        ServerLogService.writeLog(LogLevel.Info, `Reconected ${name}`);
      },
    );
    this._daikinManager.devices[name] = d;
    return d;
  }

  private static initializeDevice(d: DaikinAC, name: string): void {
    if (this._ownDevices[name] === undefined) {
      ServerLogService.writeLog(LogLevel.Alert, `Unbekanntes Daikin Gerät "${name}"`);
      return;
    }
    this._ownDevices[name].device = d;
    Devices.energymanager?.addExcessConsumer(this._ownDevices[name]);
    ServerLogService.writeLog(LogLevel.Debug, `Daikin ${name} gefunden`);
  }
}
