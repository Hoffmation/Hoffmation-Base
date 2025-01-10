import { LogLevel, ServerLogService } from '../../logging';
import { iCameraDevice } from '../baseDeviceInterfaces';
import { BlueIrisCameraDevice } from './blueIrisCameraDevice';

export class BlueIrisCoordinator {
  private static cameraDeviceMap: Map<string, iCameraDevice> = new Map<string, iCameraDevice>();

  public static addDevice(device: iCameraDevice, devName: string) {
    this.cameraDeviceMap.set(devName, device);
  }

  public static update(idSplit: string[], state: ioBroker.State) {
    if (idSplit.length < 5) {
      return;
    }
    const devName = idSplit[3];
    const dev: iCameraDevice | undefined = this.cameraDeviceMap.get(devName ?? '');
    if (dev === undefined) {
      ServerLogService.writeLog(LogLevel.Warn, `Unknown Blue Iris Device "${devName}"`);
      return;
    }
    (dev as BlueIrisCameraDevice).update(idSplit, state);
  }
}
