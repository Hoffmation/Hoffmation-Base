import { Client, DeviceAction, NodeMerlinWrtApi } from 'node-merlin-wrt-api';
import { Router } from './router.js';
import { iAsusConfig } from '../../config/index.js';
import { ServerLogService } from '../log-service/index.js';
import { LogLevel } from '../../../models/index.js';

export class AsusRouter extends Router {
  public authorizeDevice(
    _mac: string,
    _minutes: number,
    _uploadLimit: number,
    _downloadLimit: number,
  ): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  private _api: NodeMerlinWrtApi;

  public constructor(config: iAsusConfig) {
    super();
    this._api = new NodeMerlinWrtApi(config.username, config.password, config.address, config.ignoreSSL === true);
    Router.setRouter(this);
  }

  public async reconnectDeviceByIp(ip: string): Promise<boolean> {
    ServerLogService.writeLog(LogLevel.Debug, `Reconnecting Ip Device "${ip}"`);
    return new Promise<boolean>((res, _rej) => {
      this._api
        .getClientByIp(ip)
        .then((client: Client | null) => {
          if (client === null) {
            ServerLogService.writeLog(
              LogLevel.Warn,
              `Couldn't reconnect device, as no device found for ip-address ${ip}`,
            );
            res(false);
            this._api.logout();
            return;
          }
          res(this.reconnectDeviceByMac(client.rawData.mac));
          this._api.logout();
        })
        .catch((reason) => {
          ServerLogService.writeLog(
            LogLevel.Warn,
            `Couldn't reconnect device, as ip-lookup failed due to: "${reason}"`,
          );
          this._api.logout();
          res(false);
        });
    });
  }

  public async reconnectDeviceByMac(mac: string): Promise<boolean> {
    return this._api.performDeviceActionByMac(mac, DeviceAction.RECONNECT);
  }
}
