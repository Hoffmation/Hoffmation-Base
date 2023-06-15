import { ZigbeeActuator } from './BaseDevices';
import { LogLevel } from '../../../models';
import { DeviceType } from '../deviceType';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class ZigbeeUbisysActuator extends ZigbeeActuator {
  private _loadPower: number = 0;

  public constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType = DeviceType.ZigbeeUbisysActuator) {
    super(pInfo, deviceType, `${pInfo.fullID}.state`);
  }

  public get isActuatorOn(): boolean {
    return this.actuatorOn;
  }

  public get loadPower(): number {
    return this._loadPower;
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
    switch (idSplit[3]) {
      case 'load_power':
        const newLoadPower: number = state.val as number;
        this.log(
          Math.abs(newLoadPower - this._loadPower) > 0.25 ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new current load power: ${state.val}`,
        );
        this._loadPower = newLoadPower;
        break;
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
