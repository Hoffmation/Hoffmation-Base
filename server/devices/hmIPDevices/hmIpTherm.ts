import { HmIPDevice } from './hmIpDevice';
import { HmIpDeviceType } from './hmIpDeviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '/models/logLevel';
import { ServerLogService } from '/server/services/log-service';

export class HmIpTherm extends HmIPDevice {
  public constructor(pInfo: DeviceInfo) {
    super(pInfo, HmIpDeviceType.HmIpTherm);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.Trace,
      `Thermostat "${this.info.customName}" Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
  }
}
