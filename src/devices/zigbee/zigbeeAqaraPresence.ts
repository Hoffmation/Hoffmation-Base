import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { ZigbeeMotionSensor } from './BaseDevices';
import { DeviceType, LogLevel } from '../../enums';

export class ZigbeeAqaraPresence extends ZigbeeMotionSensor {
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAqaraPresence);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Motion update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'presence':
        this.log(LogLevel.Trace, `Motion sensor: Update for motion of ${this.info.customName}: ${state.val}`);
        this.updateMovement(state.val as boolean);
        break;
    }
  }
}
