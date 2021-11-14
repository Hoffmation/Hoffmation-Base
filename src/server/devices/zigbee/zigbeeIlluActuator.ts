import { LogLevel } from 'index';
import { DeviceInfo } from 'index';
import { DeviceType } from 'index';
import { ServerLogService } from 'index';
import { ZigbeeActuator } from 'index';

export class ZigbeeIlluActuator extends ZigbeeActuator {
  public get isActuatorOn(): boolean {
    return this.actuatorOn;
  }
  public constructor(pInfo: DeviceInfo, deviceType: DeviceType = DeviceType.ZigbeeIlluActuator) {
    super(pInfo, deviceType, `${pInfo.fullID}.state`);
  }

  public update(
    idSplit: string[],
    state: ioBroker.State,
    initial: boolean = false,
    handledByChildObject: boolean = false,
  ): void {
    if (!handledByChildObject) {
      ServerLogService.writeLog(
        LogLevel.DeepTrace,
        `Aktuator Update für "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
      );
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
