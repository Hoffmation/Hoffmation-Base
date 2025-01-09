import { DeviceType } from '../deviceType.js';
import { iLamp } from '../baseDeviceInterfaces/index.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';
import { ZigbeeLamp } from './BaseDevices/index.js';

export class ZigbeeIlluLampe extends ZigbeeLamp implements iLamp {
  protected readonly _actuatorOnStateIdState: string;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluLampe);
    this._actuatorOnStateIdState = `${pInfo.fullID}.${this._stateNameState}`;
  }
}
