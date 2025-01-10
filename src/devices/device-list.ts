import { iBaseDevice, iDeviceList } from '../interfaces';
import { API } from '../api';

export class DeviceList implements iDeviceList {
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
