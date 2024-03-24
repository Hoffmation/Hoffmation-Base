import { ZigbeeActuator } from './BaseDevices';
import { LogLevel } from '../../../models';
import { DeviceType } from '../deviceType';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class ZigbeeIlluActuator extends ZigbeeActuator {
  public constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType = DeviceType.ZigbeeIlluActuator) {
    super(pInfo, deviceType, `${pInfo.fullID}.state`);
  }

  /** @inheritDoc */
  public update(
    idSplit: string[],
    state: ioBroker.State,
    initial: boolean = false,
    handledByChildObject: boolean = false,
  ): void {
    if (!handledByChildObject) {
      this.log(LogLevel.DeepTrace, `Aktuator Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    }
    super.update(idSplit, state, initial, true);
  }
}
