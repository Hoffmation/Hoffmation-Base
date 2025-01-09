import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';
import { OwnGoveeDevice } from './own-govee-device';
import { iGoveeSettings } from '../../config';
import * as http from 'http';
import { GoveeDeviceData } from './govee-device-data';
import { Utils } from '../utils';

export class GooveeService {
  private static _serverUrl: string = 'http://127.0.0.1:3000';
  private static ownDevices: { [name: string]: OwnGoveeDevice } = {};
  private static _refreshInterval: NodeJS.Timeout | null = null;

  public static addOwnDevices(gvDevice: { [name: string]: OwnGoveeDevice }): void {
    this.ownDevices = gvDevice;
  }

  public static initialize(config: iGoveeSettings): void {
    ServerLogService.writeLog(LogLevel.Debug, 'Initializing Goovee-Service');
    this._serverUrl = config.url;
    this._refreshInterval = Utils.guardedInterval(this.loadDevices, 5000, this, true);
  }

  public static cleanup(): void {
    if (this._refreshInterval !== null) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }

  public static async sendCommand(device: OwnGoveeDevice, command: string): Promise<boolean> {
    return new Promise<boolean>((resolve, _reject) => {
      const requestLink: string = `${this._serverUrl}/device/${device.deviceId}/${command}`;
      const req = http.get(requestLink, (res) => {
        if (res.statusCode !== 200) {
          ServerLogService.writeLog(
            LogLevel.Alert,
            `Failed to send Govee Command(${requestLink}): ${res.statusCode} - ${res.statusMessage}`,
          );
          resolve(false);
          return;
        }
        resolve(true);
        return;
      });
      req.on('error', (e) => {
        ServerLogService.writeLog(LogLevel.Info, `Govee Error: ${e.message}`);
      });
    });
  }

  private static loadDevices(): void {
    const req: http.ClientRequest = http.get(`${this._serverUrl}/devices`, (res) => {
      if (res.statusCode !== 200) {
        ServerLogService.writeLog(LogLevel.Alert, `Failed to load Govee Devices: ${res.statusCode}`);
        return;
      }
      res.on('data', (d) => {
        const data: { [name: string]: GoveeDeviceData } = JSON.parse(d.toString());
        Object.keys(data).forEach((key) => {
          const deviceData: GoveeDeviceData = data[key];
          const ownDevice = this.ownDevices[key];
          if (ownDevice === undefined) {
            ServerLogService.writeLog(LogLevel.DeepTrace, `Unknown Govee Device "${key}"`);
            return;
          }
          ownDevice.update(deviceData);
        });
      });
    });
    req.on('error', (e) => {
      ServerLogService.writeLog(LogLevel.Info, `Govee Error: ${e.message}`);
    });
  }
}
