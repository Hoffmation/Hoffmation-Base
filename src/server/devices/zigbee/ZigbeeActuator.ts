import { ServerLogService } from '../../services/log-service';
import { Utils } from '../../services/utils/utils';
import { ActuatorSettings } from '../../../models/actuatorSettings';
import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeDevice } from './zigbeeDevice';
import { LogLevel } from '../../../models/logLevel';
import { DeviceType } from '../deviceType';

export class ZigbeeActuator extends ZigbeeDevice {
  public settings: ActuatorSettings = new ActuatorSettings();
  protected readonly actuatorOnSwitchID: string;
  protected queuedValue: boolean | null = null;
  protected actuatorOn: boolean = false;
  private _turnOffTimeout: NodeJS.Timeout | undefined = undefined;
  private turnOffTime: number = 0;

  public constructor(pInfo: DeviceInfo, type: DeviceType, actuatorOnSwitchID: string) {
    super(pInfo, type);
    this.actuatorOnSwitchID = actuatorOnSwitchID;
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
    this.queuedValue = null;
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        !handledByChildObject &&
          ServerLogService.writeLog(LogLevel.Trace, `Aktor Update für ${this.info.customName} auf ${state.val}`);
        this.actuatorOn = state.val as boolean;
        break;
    }
  }

  public setActuator(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    if (this.actuatorOnSwitchID === '') {
      ServerLogService.writeLog(LogLevel.Error, `Keine Switch ID für "${this.info.customName}" bekannt.`);
      return;
    }

    if (!force && Utils.nowMS() < this.turnOffTime) {
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Skip automatic command for "${this.info.customName}" to ${pValue} as it is locked until ${new Date(
          this.turnOffTime,
        ).toLocaleTimeString()}`,
      );
      return;
    }

    if (!force && pValue === this.actuatorOn && this.queuedValue === null) {
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Skip actuator command for "${this.info.customName}" as it is already ${pValue}`,
      );
      return;
    }

    ServerLogService.writeLog(LogLevel.Debug, `Stecker schalten: "${this.info.customName}" Wert: ${pValue}`);
    this.setState(this.actuatorOnSwitchID, pValue, undefined, (err) => {
      console.log(`Stecker schalten ergab Fehler: ${err}`);
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
        ServerLogService.writeLog(LogLevel.Debug, `Delayed Turnoff for "${this.info.customName}" initiated`);
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
