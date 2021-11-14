import { LogLevel } from '../../../models/logLevel';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceType } from '../deviceType';
import { ServerLogService } from '../../services/log-service';
import { ZigbeeActuator } from './ZigbeeActuator';

export class ZigbeeIkeaSteckdose extends ZigbeeActuator {
  public get steckerOn(): boolean {
    return super.actuatorOn;
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIkeaSteckdose, `${pInfo.fullID}.state`);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Stecker Update für "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
  }

  public setStecker(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    super.setActuator(pValue, timeout, force);
  }

  public toggleStecker(force: boolean = false): boolean {
    return super.toggleActuator(force);
  }
}
