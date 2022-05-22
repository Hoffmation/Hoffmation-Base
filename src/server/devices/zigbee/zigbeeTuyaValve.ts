import { ZigbeeHeater } from './BaseDevices';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceType } from '../deviceType';

export class ZigbeeTuyaValve extends ZigbeeHeater {
  public constructor(pInfo: DeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
  }
}
