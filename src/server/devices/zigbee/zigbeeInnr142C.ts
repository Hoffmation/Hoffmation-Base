import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';
import { ZigbeeLedRGBCCT } from './BaseDevices';

export class ZigbeeInnr142C extends ZigbeeLedRGBCCT {
  protected readonly _stateIdBrightness: string;
  protected readonly _stateIdColor: string;
  protected readonly _stateIdColorTemp: string;
  protected readonly _stateIdState: string;
  protected readonly _stateIdTransitionTime: string;
  protected readonly _stateNameBrightness: string = 'brightness';
  protected readonly _stateNameState: string = 'state';
  protected readonly _stateNameTransitionTime: string = 'transition_time';
  protected readonly _stateNameColor: string = 'color';
  protected readonly _stateNameColorTemp: string = 'colortemp';
  protected readonly _debounceStateDelay: number = 3500;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeInnr142C);
    this._stateIdBrightness = `${this.info.fullID}.brightness`;
    this._stateIdColor = `${this.info.fullID}.color`;
    this._stateIdColorTemp = `${this.info.fullID}.colortemp`;
    this._stateIdState = `${this.info.fullID}.state`;
    this._stateIdTransitionTime = `${this.info.fullID}.transition_time`;
  }
}
