import { DeviceType } from '../deviceType';
import { iLamp } from '../baseDeviceInterfaces';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { ZigbeeLamp } from './BaseDevices';

export class ZigbeeIlluLampe extends ZigbeeLamp implements iLamp {
  protected readonly _actuatorOnStateIdState: string;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluLampe);
    this._actuatorOnStateIdState = `${pInfo.fullID}.${this._stateNameState}`;
  }
}
