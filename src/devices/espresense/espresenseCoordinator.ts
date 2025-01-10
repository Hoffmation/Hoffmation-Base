import { EspresenseDevice } from './espresenseDevice';

export class EspresenseCoordinator {
  private static espDeviceMap: Map<string, EspresenseDevice> = new Map<string, EspresenseDevice>();

  public static addDevice(device: EspresenseDevice, devName: string) {
    this.espDeviceMap.set(devName, device);
  }

  public static update(idSplit: string[], state: ioBroker.State) {
    if (idSplit.length < 6 || idSplit[3] !== 'devices') {
      return;
    }
    const devName = idSplit[5];
    const dev = this.espDeviceMap.get(devName ?? '');
    if (dev === undefined) {
      return;
    }
    dev.update(idSplit[4], state);
  }
}
