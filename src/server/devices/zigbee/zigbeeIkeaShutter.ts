import { ZigbeeShutter } from './BaseDevices';
import { DeviceType } from '../deviceType';
import { LogLevel } from '../../../models';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class ZigbeeIkeaShutter extends ZigbeeShutter {
  private readonly _positionStateId: string;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIkeaShutter);
    this._positionStateId = `${this.info.fullID}.position`;
    // this.presenceStateID = `${this.info.fullID}.1.${HmIpPraezenz.PRESENCE_DETECTION}`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    switch (idSplit[3]) {
      case 'position':
        this.log(LogLevel.Trace, `Shutter Update for ${this.info.customName} to "${state.val}"`);
        this.currentLevel = state.val as number;
        break;
    }

    super.update(idSplit, state, initial, true);
  }

  protected override moveToPosition(pPosition: number): void {
    this.setState(this._positionStateId, pPosition);
  }
}
