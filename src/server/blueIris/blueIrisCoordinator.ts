import { CameraDevice } from './cameraDevice';

export class BlueIrisCoordinator {
  private static cameraDeviceMap: Map<string, CameraDevice> = new Map<string, CameraDevice>();

  public static addDevice(device: CameraDevice, devName: string) {
    this.cameraDeviceMap.set(devName, device);
  }

  public static update(idSplit: string[], state: ioBroker.State) {
    if (idSplit.length < 5) {
      return;
    }
    const devName = idSplit[3];
    const dev = this.cameraDeviceMap.get(devName ?? '');
    if (dev === undefined) {
      return;
    }
    dev.update(idSplit[4], state);
  }
}
