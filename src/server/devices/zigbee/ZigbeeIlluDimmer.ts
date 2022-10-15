import { ZigbeeDimmer } from './BaseDevices/zigbeeDimmer';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';

export class ZigbeeIlluDimmer extends ZigbeeDimmer {
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluDimmer);
    this.stateID = `${this.info.fullID}.state`;
    this.brightnessID = `${this.info.fullID}.brightness`;
    this.transitionID = `${this.info.fullID}.transition_time`;
  }
}
