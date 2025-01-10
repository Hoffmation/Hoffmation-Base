import { ZigbeeDimmer } from './BaseDevices';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../../enums';

export class ZigbeeOsramDimmer extends ZigbeeDimmer {
  protected _stateNameBrightness: string = 'brightness';
  protected _stateNameState: string = 'state';
  protected _stateNameTransitionTime: string = 'transition_time';
  protected _stateIdBrightness: string;
  protected _actuatorOnStateIdState: string;
  protected _stateIdTransitionTime: string;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeOsramDimmer);
    this._actuatorOnStateIdState = `${this.info.fullID}.state`;
    this._stateIdBrightness = `${this.info.fullID}.brightness`;
    this._stateIdTransitionTime = `${this.info.fullID}.transition_time`;
  }
}
