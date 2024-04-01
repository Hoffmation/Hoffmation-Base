import { DeviceType } from '../deviceType';
import { ZigbeeActuator } from './BaseDevices';
import { LogLevel } from '../../../models';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class ZigbeeIkeaSteckdose extends ZigbeeActuator {
  protected readonly _stateIdState: string;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIkeaSteckdose);
    this._stateIdState = `${pInfo.fullID}.state`;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Stecker Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
  }
}
