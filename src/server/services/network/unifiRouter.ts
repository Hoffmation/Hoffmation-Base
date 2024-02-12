import { Router } from './router';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import Unifi from 'node-unifi';
import { iUnifiSettings } from '../../config';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';

export class UnifiRouter extends Router {
  public get loggedIn(): boolean {
    return this._loggedIn;
  }

  private readonly _api: Unifi.Controller;
  private _loggedIn: boolean = false;

  public constructor(config: iUnifiSettings) {
    super();
    this._api = new Unifi.Controller(config.loginOptions);
    Router.setRouter(this);
    this.login();
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
