import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { IDeviceUpdater } from './iDeviceUpdater';
import { ServerLogService } from '../services';
import { LogLevel } from '../../models';
import { Devices } from './devices';
import { iBaseDevice } from './baseDeviceInterfaces';
import { MqttCoordinator } from './mqtt';
import { IoBrokerDeviceInfo } from './IoBrokerDeviceInfo';

export class DeviceUpdater implements IDeviceUpdater {
  public devices: Devices;

  constructor(pDevices: Devices) {
    this.devices = pDevices;
  }

  public updateObject(pId: string, pObj: ioBroker.Object): void {
    const idSplit: string[] = IoBrokerDeviceInfo.idSplitter(pId);
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
    const idSplit: string[] = IoBrokerDeviceInfo.idSplitter(id);
    if (idSplit.length < 2) return;

    if (idSplit[0] == 'mqtt') {
      MqttCoordinator.update(idSplit, state);
    }
    const device: undefined | iBaseDevice = Devices.alLDevices[`${idSplit[0]}-${idSplit[2]}`];
    if (typeof device === 'undefined' || (device as IoBrokerBaseDevice).update === undefined) {
      return;
    }
    try {
      (device as IoBrokerBaseDevice).update(idSplit, state, initial, false);
    } catch (e) {
      ServerLogService.writeLog(
        LogLevel.Alert,
        `deviceUpdater.updateState('${id}', '${state}'): Error occured updating Device: ${e} \n ${
          (e as Error)?.stack ?? ''
        }`,
      );
    }
  }
}
