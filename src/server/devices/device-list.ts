import { AcDevice, API, OwnAcDevices, OwnSonosDevice, OwnSonosDevices } from '../services';
import { IBaseDevice } from './baseDeviceInterfaces';

export class DeviceList {
  public constructor(
    private _ids: string[] = [],
    private readonly _isSonos: boolean = false,
    private readonly _isAc: boolean = false,
  ) {
    // Empty
  }

  public get ids(): string[] {
    return this._ids;
  }

  public getDevices(): Array<IBaseDevice | OwnSonosDevice | AcDevice> {
    const result: Array<IBaseDevice | OwnSonosDevice | AcDevice> = [];

    for (const dID of this._ids) {
      if (this._isSonos) {
        const s: OwnSonosDevice = OwnSonosDevices.ownDevices[dID];
        if (s !== undefined) {
          result.push(OwnSonosDevices.ownDevices[dID]);
        }
      } else if (this._isAc) {
        const acDevice: AcDevice = OwnAcDevices.ownDevices[dID];
        if (acDevice !== undefined) {
          result.push(OwnAcDevices.ownDevices[dID]);
        }
      } else {
        const d = API.getDevice(dID);
        if (d !== undefined) {
          result.push(d);
        }
      }
    }
    return result;
  }
}
