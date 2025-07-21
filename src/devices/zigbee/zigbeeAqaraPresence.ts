import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { ZigbeeMotionSensor } from './BaseDevices';
import { DeviceType } from '../../enums';

export class ZigbeeAqaraPresence extends ZigbeeMotionSensor {
  protected override _needsMovementResetFallback: boolean = false;
  protected override readonly _occupancyStateId: string = 'presence';

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAqaraPresence);
  }
}
