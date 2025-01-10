import { iBaseDevice } from './baseDeviceInterfaces';
import { API } from '../services/api';

export class DeviceList {
  public constructor(private _ids: string[] = []) {
    // Empty
  }

  public get ids(): string[] {
    return this._ids;
  }

  public getDevices(): Array<iBaseDevice> {
    const result: Array<iBaseDevice> = [];

    for (const dID of this._ids) {
      const d = API.getDevice(dID);
      if (d !== undefined) {
        result.push(d);
      }
    }
    return result;
  }
}
