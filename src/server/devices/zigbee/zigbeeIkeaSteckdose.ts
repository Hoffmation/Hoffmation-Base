import { DeviceType } from '../deviceType.js';
import { ZigbeeActuator } from './BaseDevices/index.js';
import { LogLevel } from '../../../models/index.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';

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
