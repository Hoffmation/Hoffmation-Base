import { API } from '../services/api/api-service';
import { Devices } from './devices';
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

    for (const dID in API.getDevices()) {
      if (!this._ids.includes(dID)) {
        continue;
      }
      result.push(Devices.alLDevices[dID]);
    }
    for (const name in OwnSonosDevices.ownDevices) {
      if (!this._ids.includes(name)) {
        continue;
      }
      result.push(OwnSonosDevices.ownDevices[name]);
    }
    return result;
  }
}
