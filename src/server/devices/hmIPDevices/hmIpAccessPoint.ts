import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models';

export class HmIpAccessPoint extends HmIPDevice {
  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpAccessPoint);
  }

  private _ip: string = '';

  public get ip(): string {
    return this._ip;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `AP Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);

    switch (idSplit[3]) {
      case '0':
        this.updateBaseInformation(idSplit[4], state);
        break;
    }
  }

  private updateBaseInformation(name: string, state: ioBroker.State) {
    switch (name) {
      case 'IP_ADDRESS':
        this._ip = state.val as string;
        break;
    }
  }
}
