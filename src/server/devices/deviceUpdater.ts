import { IoBrokerBaseDevice } from './IoBrokerBaseDevice.js';
import { IDeviceUpdater } from './iDeviceUpdater.js';
import { API, ServerLogService } from '../services/index.js';
import { LogLevel } from '../../models/index.js';
import { iBaseDevice } from './baseDeviceInterfaces/index.js';
import { MqttCoordinator } from './mqtt/index.js';
import { IoBrokerDeviceInfo } from './IoBrokerDeviceInfo.js';
import { Devices } from './devices.js';

export class DeviceUpdater implements IDeviceUpdater {
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
    } else if (idSplit[0] == Devices.IDENTIFIER_SMART_GARDEN) {
      if (
        idSplit[1] === 'admin' ||
        idSplit.length < 4 ||
        idSplit[2].indexOf('LOCATION') !== 0 ||
        idSplit[3].indexOf('DEVICE') !== 0
      ) {
        // This is no update for a smartgarden device
        return;
      }
      classifier = Devices.IDENTIFIER_SMART_GARDEN;
      devId = idSplit[3].replace(/-2D/g, '-');
    } else if (idSplit[0] == Devices.IDENTIFIER_VELUX) {
      if (idSplit[1] === 'admin' || idSplit[2].indexOf('products') !== 0) {
        // This is no update for a velux device
        return;
      }
      classifier = Devices.IDENTIFIER_VELUX;
      devId = idSplit[3];
    }
    const allDevicesKey: string = `${classifier}-${devId}`;
    const device: undefined | iBaseDevice = API.getDevice(allDevicesKey, false);
    if (typeof device === 'undefined' || (device as IoBrokerBaseDevice).update === undefined) {
      // classifier == Devices.IDENTIFIER_SMART_GARDEN &&
      //   ServerLogService.writeLog(
      //     LogLevel.Warn,
      //     `deviceUpdater.updateState('${id}', ${JSON.stringify(state)}'): Device ${allDevicesKey} type is "${typeof device}"`,
      //   );
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
