import { API } from '../services/api/api-service';
import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { OwnSonosDevice } from '../services/Sonos/sonos-service';
import { OwnSonosDevices } from '../services/Sonos/OwnSonosDevices';

export class DeviceList {
  public get ids(): string[] {
    return this._ids;
  }

  public constructor(private _ids: string[] = []) {}

  public getDevices(): Array<IoBrokerBaseDevice | OwnSonosDevice> {
    const result: Array<IoBrokerBaseDevice | OwnSonosDevice> = [];

    for (const dID in this._ids) {
      const d = API.getDevice(dID);
      if (d !== undefined) {
        result.push(d);
      }
    }
    for (const name in this._ids) {
      const s = OwnSonosDevices.ownDevices[name];
      if (s !== undefined) {
        result.push(OwnSonosDevices.ownDevices[name]);
      }
    }
    return result;
  }
}
