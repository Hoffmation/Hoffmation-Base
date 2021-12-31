import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models/logLevel';
import { ZigbeeMotionSensor } from './zigbeeMotionSensor';

export class ZigbeeSonoffMotion extends ZigbeeMotionSensor {
  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeSonoffMotion);
    this._needsMovementResetFallback = false;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(
      LogLevel.DeepTrace,
      `Motion update for "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
  }
}
