import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { IDeviceUpdater } from './iDeviceUpdater';
import { ServerLogService } from '../services/log-service/log-service';
import { LogLevel } from '../../models/logLevel';
import { Devices } from './devices';

export class DeviceUpdater implements IDeviceUpdater {
  public devices: Devices;

  constructor(pDevices: Devices) {
    this.devices = pDevices;
  }

  public updateObject(pId: string, pObj: ioBroker.Object): void {
    const idSplit: string[] = pId.split('.');
    if (idSplit.length < 2) return;

    if (idSplit[0] === Devices.IDENTIFIER_HOMEMATIC) {
      console.log(`Neuer Wert in HomematicIP für ${pId}: ${JSON.stringify(pObj)}`);
    }
  }

  public updateState(id: string, state: ioBroker.State, initial: boolean = false): void {
    if (state === null) {
      // Ignore null states
      return;
    }
    const idSplit: string[] = id.split('.');
    if (idSplit.length < 2) return;

    const device: undefined | IoBrokerBaseDevice = Devices.alLDevices[`${idSplit[0]}-${idSplit[2]}`];
    if (typeof device === 'undefined') {
      return;
    }
    try {
      device.update(idSplit, state, initial, false);
    } catch (e: any) {
      ServerLogService.writeLog(
        LogLevel.Alert,
        `deviceUpdater.updateState('${id}', '${state}'): Error occured updating Device: ${e} \n ${e.stack}`,
      );
    }
  }
}
