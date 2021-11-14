import { HmIPDevice } from 'index';
import { DeviceType } from 'index';
import { DeviceInfo } from 'index';
import { LogLevel } from 'index';
import { ServerLogService } from 'index';

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
