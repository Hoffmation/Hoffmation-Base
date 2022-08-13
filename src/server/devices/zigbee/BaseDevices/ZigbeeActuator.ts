import { LogDebugType, Utils } from '../../../services';
import { ActuatorSettings, LogLevel } from '../../../../models';
import { DeviceType } from '../../deviceType';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { iActuator } from '../../baseDeviceInterfaces';
import { ZigbeeDevice } from './zigbeeDevice';
import { DeviceCapability } from '../../DeviceCapability';

export class ZigbeeActuator extends ZigbeeDevice implements iActuator {
  public settings: ActuatorSettings = new ActuatorSettings();
  protected readonly actuatorOnSwitchID: string;
  protected queuedValue: boolean | null = null;
  public actuatorOn: boolean = false;
  private _turnOffTimeout: NodeJS.Timeout | undefined = undefined;
  private turnOffTime: number = 0;

  public constructor(pInfo: IoBrokerDeviceInfo, type: DeviceType, actuatorOnSwitchID: string) {
    super(pInfo, type);
    this.deviceCapabilities.push(DeviceCapability.actuator);
    this.actuatorOnSwitchID = actuatorOnSwitchID;
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
    this.queuedValue = null;
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        !handledByChildObject && this.log(LogLevel.Trace, `Aktor Update für ${this.info.customName} auf ${state.val}`);
        this.actuatorOn = state.val as boolean;
        break;
    }
  }

  public setActuator(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    if (this.actuatorOnSwitchID === '') {
      this.log(LogLevel.Error, `Keine Switch ID bekannt.`);
      return;
    }

    if (!force && Utils.nowMS() < this.turnOffTime) {
      this.log(
        LogLevel.Debug,
        `Skip automatic command to ${pValue} as it is locked until ${new Date(this.turnOffTime).toLocaleTimeString()}`,
      );
      return;
    }

    if (!force && pValue === this.actuatorOn && this.queuedValue === null) {
      this.log(
        LogLevel.Debug,
        `Skip actuator command as it is already ${pValue}`,
        LogDebugType.SkipUnchangedActuatorCommand,
      );
      return;
    }

    this.log(LogLevel.Debug, `Set outlet Acutator to "${pValue}"`, LogDebugType.SetActuator);
    this.setState(this.actuatorOnSwitchID, pValue, undefined, (err) => {
      this.log(LogLevel.Error, `Switching actuator resulted in error: ${err}`);
    });
    this.queuedValue = pValue;

    if (this._turnOffTimeout !== undefined) {
      clearTimeout(this._turnOffTimeout);
      this._turnOffTimeout = undefined;
    }

    if (timeout < 0 || !pValue) {
      return;
    }

    this.turnOffTime = Utils.nowMS() + timeout;
    this._turnOffTimeout = Utils.guardedTimeout(
      () => {
        this.log(LogLevel.Debug, `Delayed Turnoff initiated`);
        this._turnOffTimeout = undefined;
        if (!this.room) {
          this.setActuator(false, -1, true);
        } else {
          this.room.setLightTimeBased(true);
        }
      },
      timeout,
      this,
    );
  }

  public toggleActuator(force: boolean = false): boolean {
    const newVal = this.queuedValue !== null ? !this.queuedValue : !this.actuatorOn;
    const timeout: number = newVal && force ? 30 * 60 * 1000 : -1;
    this.setActuator(newVal, timeout, force);
    return newVal;
  }
}
