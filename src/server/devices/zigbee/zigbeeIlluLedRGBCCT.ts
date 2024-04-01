import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';
import { ZigbeeLedRGBCCT } from './BaseDevices';

export class ZigbeeIlluLedRGBCCT extends ZigbeeLedRGBCCT {
  protected readonly _stateIdBrightness: string;
  protected readonly _stateIdColor: string;
  protected readonly _stateIdColorTemp: string;
  protected readonly _actuatorOnStateIdState: string;
  protected readonly _stateIdTransitionTime: string;
  protected readonly _stateNameBrightness: string = 'brightness';
  protected readonly _stateNameState: string = 'state';
  protected readonly _stateNameTransitionTime: string = 'transition_time';
  protected readonly _stateNameColor: string = 'color';
  protected readonly _stateNameColorTemp: string = 'colortemp';

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluLedRGBCCT);
    this._stateIdBrightness = `${this.info.fullID}.brightness`;
    this._stateIdColor = `${this.info.fullID}.color`;
    this._stateIdColorTemp = `${this.info.fullID}.colortemp`;
    this._actuatorOnStateIdState = `${this.info.fullID}.state`;
    this._stateIdTransitionTime = `${this.info.fullID}.transition_time`;
  }
}
