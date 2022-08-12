import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { LogLevel } from '../../../models';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class HmIpTherm extends HmIPDevice {
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpTherm);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Thermostat Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
  }
}
