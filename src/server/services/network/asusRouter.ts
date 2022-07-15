import { Client, DeviceAction, NodeMerlinWrtApi } from 'node-merlin-wrt-api';
import { Router } from './router';
import { iAsusConfig } from '../../config';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';

export class AsusRouter extends Router {
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
            return;
          }
          res(this.reconnectDeviceByMac(client.rawData.mac));
        })
        .catch((reason) => {
          ServerLogService.writeLog(
            LogLevel.Warn,
            `Couldn't reconnect device, as ip-lookup failed due to: "${reason}"`,
          );
          res(false);
        });
    });
  }

  public async reconnectDeviceByMac(mac: string): Promise<boolean> {
    return this._api.performDeviceActionByMac(mac, DeviceAction.RECONNECT);
  }
}
