import { ZigbeeDimmer } from './BaseDevices';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';

export class ZigbeeIlluDimmer extends ZigbeeDimmer {
  protected _stateNameBrightness: string = 'brightness';
  protected _stateNameState: string = 'state';
  protected _stateNameTransitionTime: string = 'transition_time';
  protected _stateIdBrightness: string;
  protected _stateIdState: string;
  protected _stateIdTransitionTime: string;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluDimmer);
    this._stateIdState = `${this.info.fullID}.state`;
    this._stateIdBrightness = `${this.info.fullID}.brightness`;
    this._stateIdTransitionTime = `${this.info.fullID}.transition_time`;
  }
}
