import { DeviceType } from '../deviceType';
import { ZigbeeActuator } from './BaseDevices';
import { LogLevel } from '../../logging';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class ZigbeeIkeaSteckdose extends ZigbeeActuator {
  protected readonly _actuatorOnStateIdState: string;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIkeaSteckdose);
    this._actuatorOnStateIdState = `${pInfo.fullID}.state`;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Stecker Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
  }
}
