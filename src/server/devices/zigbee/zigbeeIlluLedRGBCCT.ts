import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';
import { ZigbeeLedRGBCCT } from './BaseDevices';

export class ZigbeeIlluLedRGBCCT extends ZigbeeLedRGBCCT {
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluLedRGBCCT);
    this._stateID = `${this.info.fullID}.state`;
    this._brightnessID = `${this.info.fullID}.brightness`;
    this._transitionID = `${this.info.fullID}.transition_time`;
    this._colorID = `${this.info.fullID}.color`;
    this._colorTempID = `${this.info.fullID}.colortemp`;
  }
}
