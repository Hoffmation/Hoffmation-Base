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
    if (state.q === 0x20) {
      // Ignore substitute default values
      return;
    }
    const idSplit: string[] = IoBrokerDeviceInfo.idSplitter(id);
    if (idSplit.length < 2) return;

    let classifier: string = idSplit[0];
    let devId: string = idSplit[2];
    if (idSplit[0] == 'mqtt') {
      MqttCoordinator.update(idSplit, state);
    } else if (idSplit[0] == Devices.IDENTIFIER_ZIGBEE2MQTT) {
      classifier = Devices.IDENTIFIER_ZIGBEE;
      devId = idSplit[2].substring(2);
    }
    const device: undefined | iBaseDevice = Devices.alLDevices[`${classifier}-${devId}`];
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
