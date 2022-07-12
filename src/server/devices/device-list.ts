import { AcDevice, API, OwnDaikinDevice, OwnDaikinDevices, OwnSonosDevice, OwnSonosDevices } from '../services';
import { IBaseDevice } from './baseDeviceInterfaces';

export class DeviceList {
  public constructor(private _ids: string[] = []) {
    // Empty
  }

  public get ids(): string[] {
    return this._ids;
  }

  public getDevices(): Array<IBaseDevice | OwnSonosDevice | AcDevice> {
    const result: Array<IBaseDevice | OwnSonosDevice | AcDevice> = [];

    for (const dID of this._ids) {
      const d = API.getDevice(dID);
      if (d !== undefined) {
        result.push(d);
      }
    }
    for (const name of this._ids) {
      const s: OwnSonosDevice = OwnSonosDevices.ownDevices[name];
      if (s !== undefined) {
        result.push(OwnSonosDevices.ownDevices[name]);
      }
      const daikinDevice: OwnDaikinDevice = OwnDaikinDevices.ownDevices[name];
      if (daikinDevice !== undefined) {
        result.push(OwnDaikinDevices.ownDevices[name]);
      }
    }
    return result;
  }
}
