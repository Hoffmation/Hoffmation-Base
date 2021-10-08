import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeDeviceType } from './zigbeeDeviceType';
import { LogLevel } from '/models/logLevel';
import { ServerLogService } from '/server/services/log-service';
import { ZigbeeIlluActuator } from '/server/devices/zigbee/zigbeeIlluActuator';

export class ZigbeeIlluLampe extends ZigbeeIlluActuator {
  public get lampOn(): boolean {
    return super.actuatorOn;
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, ZigbeeDeviceType.ZigbeeIlluLampe);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        ServerLogService.writeLog(LogLevel.Trace, `Lampen Update für ${this.info.customName} auf ${state.val}`);
        break;
    }
  }

  public setLight(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    ServerLogService.writeLog(LogLevel.Debug, `Lampenaktor schalten: "${this.info.customName}" Wert: ${pValue}`);
    super.setActuator(pValue, timeout, force);
  }

  public toggleLight(force: boolean = false): boolean {
    return super.toggleActuator(force);
  }
}
