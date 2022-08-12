import { DeviceType } from '../deviceType';
import { ZigbeeActuator } from './BaseDevices';
import { LogLevel } from '../../../models';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class ZigbeeIkeaSteckdose extends ZigbeeActuator {
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIkeaSteckdose, `${pInfo.fullID}.state`);
  }

  public get steckerOn(): boolean {
    return super.actuatorOn;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Stecker Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
  }

  public setStecker(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    super.setActuator(pValue, timeout, force);
  }

  public toggleStecker(force: boolean = false): boolean {
    return super.toggleActuator(force);
  }
}
