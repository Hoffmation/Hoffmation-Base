import { DeviceType } from '../deviceType.js';
import { LogLevel } from '../../../models/index.js';
import { ZigbeeMotionSensor } from './BaseDevices/index.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';

export class ZigbeeSonoffMotion extends ZigbeeMotionSensor {
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeSonoffMotion);
    this._needsMovementResetFallback = false;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Motion update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
  }
}
