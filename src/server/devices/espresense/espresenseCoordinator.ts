import { iEspresenseSettings } from '../../config';
import { LogLevel } from '../../../models';
import { API, ServerLogService } from '../../services';
import { EspresenseDevice } from './espresenseDevice';

export class EspresenseCoordinator {
  public static baseId: string;
  private static espDeviceMap: Map<string, EspresenseDevice> = new Map<string, EspresenseDevice>();

  public static initialize(settings: iEspresenseSettings) {
    this.baseId = `mqtt.${settings.mqttInstance}.espresense`;
    for (const espDevName of Object.keys(settings.roomMapping)) {
      const roomName = settings.roomMapping[espDevName];
      const room = API.getRoom(roomName);
      if (room === undefined) {
        ServerLogService.writeLog(
          LogLevel.Error,
          `Declared Espresense Room "${roomName}" for Espresense "${espDevName}" not found`,
        );
        continue;
      }
      const espDev = new EspresenseDevice(espDevName, room);
      this.espDeviceMap.set(espDevName, espDev);
    }
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
