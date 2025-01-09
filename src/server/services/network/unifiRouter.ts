import { Router } from './router.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import Unifi from 'node-unifi';
import { iUnifiConnectionOptions } from '../../config/index.js';
import { ServerLogService } from '../log-service/index.js';
import { LogLevel } from '../../../models/index.js';

export class UnifiRouter extends Router {
  public get loggedIn(): boolean {
    return this._loggedIn;
  }

  private readonly _api: Unifi.Controller;
  private _loggedIn: boolean = false;

  public constructor(config: iUnifiConnectionOptions) {
    super();
    this._api = new Unifi.Controller(config);
    Router.setRouter(this);
    this.login();
  }

  public authorizeDevice(mac: string, minutes: number, uploadLimit: number, downloadLimit: number): Promise<boolean> {
    ServerLogService.writeLog(
      LogLevel.Info,
      `Unifi: AuthorizeDevice Device "${mac}" for ${minutes} minutes with ${uploadLimit} kbps upload and ${downloadLimit} kbps download`,
    );
    return new Promise(async (resolve, _reject) => {
      if (!this.loggedIn && !(await this.login())) {
        ServerLogService.writeLog(LogLevel.Warn, `Unifi: Can't AuthorizeDevice Device "${mac}" as we can't log in`);
        resolve(false);
      }
      const result = await this._api
        .authorizeGuest(mac, minutes, uploadLimit, downloadLimit)
        .catch((error: unknown) => {
          ServerLogService.writeLog(LogLevel.Warn, `Unifi: Failed to AuthorizeDevice "${mac}" due to: ${error}`);
          resolve(false);
          return;
        });
      ServerLogService.writeLog(LogLevel.Trace, `Unifi: AuthorizeDevice ${mac} resulted in ${result}`);
      resolve(true);
    });
  }

  public reconnectDeviceByMac(mac: string): Promise<boolean> {
    ServerLogService.writeLog(LogLevel.Info, `Unifi: Reconnecting Device "${mac}"`);
    return new Promise(async (resolve, _reject) => {
      if (!this.loggedIn && !(await this.login())) {
        ServerLogService.writeLog(LogLevel.Warn, `Unifi: Can't reconnect Device "${mac}" as we can't log in`);
        resolve(false);
      }
      const result = await this._api.reconnectClient(mac).catch((error: unknown) => {
        ServerLogService.writeLog(LogLevel.Warn, `Unifi: Failed to reconnect "${mac}" due to: ${error}`);
        resolve(false);
        return;
      });
      ServerLogService.writeLog(LogLevel.Trace, `Unifi: Reconnecting ${mac} resulted in ${result}`);
      resolve(true);
    });
  }

  public reconnectDeviceByIp(_ip: string): Promise<boolean> {
    throw new Error('Method not implemented, use reconnectDeviceByMac instead.');
  }

  private login(): Promise<boolean> {
    ServerLogService.writeLog(LogLevel.Info, 'Unifi: Trying to login to Unifi-Controller');
    return new Promise(async (resolve, _reject) => {
      await this._api.login().catch((error: unknown) => {
        ServerLogService.writeLog(LogLevel.Warn, `Unifi: Login failed: ${error}`);
        this._loggedIn = false;
        resolve(false);
      });
      ServerLogService.writeLog(LogLevel.Info, 'Unifi: Login successful');
      this._loggedIn = true;
      resolve(true);
    });
  }
}
