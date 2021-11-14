import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { ServerLogService } from '../../services/log-service';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models/logLevel';

export class HmIpTherm extends HmIPDevice {
  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpTherm);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.Trace,
      `Thermostat "${this.info.customName}" Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
  }
}
