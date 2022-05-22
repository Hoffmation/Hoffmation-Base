import { ZigbeeActuator } from './BaseDevices';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models';
import { DeviceType } from '../deviceType';

export class ZigbeeIlluActuator extends ZigbeeActuator {
  public constructor(pInfo: DeviceInfo, deviceType: DeviceType = DeviceType.ZigbeeIlluActuator) {
    super(pInfo, deviceType, `${pInfo.fullID}.state`);
  }

  public get isActuatorOn(): boolean {
    return this.actuatorOn;
  }

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

  public setActuator(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    super.setActuator(pValue, timeout, force);
  }

  public toggleActuator(force: boolean = false): boolean {
    return super.toggleActuator(force);
  }
}
