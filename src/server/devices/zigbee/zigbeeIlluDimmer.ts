import { ZigbeeDimmer } from './BaseDevices';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';

export class ZigbeeIlluDimmer extends ZigbeeDimmer {
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluDimmer);
    this._stateID = `${this.info.fullID}.state`;
    this._brightnessID = `${this.info.fullID}.brightness`;
    this._transitionID = `${this.info.fullID}.transition_time`;
  }
}
