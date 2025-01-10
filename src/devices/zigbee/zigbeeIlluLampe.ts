import { iLamp } from '../../interfaces';
import { ZigbeeLamp } from './BaseDevices';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../../enums';

export class ZigbeeIlluLampe extends ZigbeeLamp implements iLamp {
  protected readonly _actuatorOnStateIdState: string;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluLampe);
    this._actuatorOnStateIdState = `${pInfo.fullID}.${this._stateNameState}`;
  }
}
