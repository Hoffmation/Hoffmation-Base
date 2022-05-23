import { API, OwnSonosDevice, OwnSonosDevices } from '../services';
import { IBaseDevice } from './baseDeviceInterfaces';

export class DeviceList {
  public constructor(private _ids: string[] = []) {
    // Empty
  }

  public get ids(): string[] {
    return this._ids;
  }

  public getDevices(): Array<IBaseDevice | OwnSonosDevice> {
    const result: Array<IBaseDevice | OwnSonosDevice> = [];

    for (const dID of this._ids) {
      const d = API.getDevice(dID);
      if (d !== undefined) {
        result.push(d);
      }
    }
    for (const name of this._ids) {
      const s = OwnSonosDevices.ownDevices[name];
      if (s !== undefined) {
        result.push(OwnSonosDevices.ownDevices[name]);
      }
    }
    return result;
  }
}
