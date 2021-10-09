import { OwnSonosDevice } from './sonos-service';

export class OwnSonosDevices {
  public static ownDevices: { [name: string]: OwnSonosDevice } = {};

  public static addDevice(device: OwnSonosDevice) {
    this.ownDevices[device.name] = device;
  }
}
