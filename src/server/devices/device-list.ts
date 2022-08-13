import { API } from '../services';
import { IBaseDevice } from './baseDeviceInterfaces';

export class DeviceList {
  public constructor(private _ids: string[] = []) {
    // Empty
  }

  public get ids(): string[] {
    return this._ids;
  }

  public getDevices(): Array<IBaseDevice> {
    const result: Array<IBaseDevice> = [];

    for (const dID of this._ids) {
      const d = API.getDevice(dID);
      if (d !== undefined) {
        result.push(d);
      }
    }
    return result;
  }
}
