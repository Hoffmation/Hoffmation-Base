import { LogLevel } from '../../models/logLevel';
import { ServerLogService } from '../services/log-service';
import { Devices } from './devices';
import { HmIPDevice } from './hmIPDevices/hmIpDevice';
import { IDeviceUpdater } from './iDeviceUpdater';
import { ZigbeeDevice } from './zigbee/zigbeeDevice';

export class DeviceUpdater implements IDeviceUpdater {
  private static IDENTIFIER_HOMEMATIC: string = 'hm-rpc';
  private static IDENTIFIER_ZIGBEE: string = 'zigbee';
  public devices: Devices;

  constructor(pDevices: Devices) {
    this.devices = pDevices;
  }

  public updateObject(pId: string, pObj: ioBroker.Object): void {
    const idSplit: string[] = pId.split('.');
    if (idSplit.length < 2) return;

    if (idSplit[0] === DeviceUpdater.IDENTIFIER_HOMEMATIC) {
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

    if (idSplit[0] === DeviceUpdater.IDENTIFIER_HOMEMATIC) {
      try {
        this.updateHomeMaticDevice(idSplit, state, initial);
      } catch (e: any) {
        ServerLogService.writeLog(
          LogLevel.Alert,
          `deviceUpdater.updateState('${id}', '${state}'): Error occured updating Device: ${e} \n ${e.stack}`,
        );
      }
    } else if (idSplit[0] === DeviceUpdater.IDENTIFIER_ZIGBEE) {
      try {
        this.updateZigbeeDevice(idSplit, state, initial);
      } catch (e: any) {
        ServerLogService.writeLog(
          LogLevel.Alert,
          `deviceUpdater.updateState('${id}', '${state}'): Error occured updating Device: ${e} \n ${e.stack}`,
        );
      }
    } else {
      ServerLogService.writeLog(LogLevel.DeepTrace, `unbekannter Identifier: "${idSplit[0]}"`);
    }
  }

  private updateHomeMaticDevice(idSplit: string[], state: ioBroker.State, initial: boolean = false) {
    const device: undefined | HmIPDevice = Devices.hmIP[idSplit[2]];
    if (typeof device === 'undefined') {
      return;
    }
    device.update(idSplit, state, initial);
  }

  private updateZigbeeDevice(idSplit: string[], state: ioBroker.State, initial: boolean = false) {
    const device: undefined | ZigbeeDevice = Devices.Zigbee[idSplit[2]];
    if (typeof device === 'undefined') {
      return;
    }
    device.update(idSplit, state, initial);
  }
}
