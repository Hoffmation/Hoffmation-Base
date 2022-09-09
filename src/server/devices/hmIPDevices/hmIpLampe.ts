import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { LogDebugType, TimeCallbackService, Utils } from '../../services';
import { ActuatorSettings, LogLevel, TimeOfDay } from '../../../models';
import { iLamp } from '../baseDeviceInterfaces';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';

export class HmIpLampe extends HmIPDevice implements iLamp {
  public lightOn: boolean = false;
  public queuedLightValue: boolean | null = null;
  public settings: ActuatorSettings = new ActuatorSettings();
  private lightOnSwitchID: string = '';
  private _turnOffTimeout: NodeJS.Timeout | undefined = undefined;
  private turnOffTime: number = 0;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpLampe);
    this.deviceCapabilities.push(DeviceCapability.lamp);
    this.lightOnSwitchID = `${this.info.fullID}.2.STATE`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Lampen Update : ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    this.queuedLightValue = null;
    switch (idSplit[3]) {
      case '1':
        if (idSplit[4] === 'STATE') {
          this.lightOn = state.val as boolean;
          this.persist();
        }
        break;
    }
  }

  /** @inheritdoc */
  public setLight(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    if (!force && pValue === this.lightOn && this.queuedLightValue === null) {
      this.log(
        LogLevel.DeepTrace,
        `Skip light command as it is already ${pValue}`,
        LogDebugType.SkipUnchangedActuatorCommand,
      );
      return;
    }
    if (this.lightOnSwitchID === '') {
      this.log(LogLevel.Error, `Keine Switch ID bekannt.`);
      return;
    }

    if (!force && Utils.nowMS() < this.turnOffTime) {
      this.log(
        LogLevel.Debug,
        `Skip automatic command to ${pValue} as it is locked until ${new Date(this.turnOffTime).toLocaleString()}`,
      );
      return;
    }

    this.log(LogLevel.Debug, `Set Light Acutator to "${pValue}"`, LogDebugType.SetActuator);
    this.setState(this.lightOnSwitchID, pValue, undefined, (err) => {
      this.log(LogLevel.Error, `Lampe schalten ergab Fehler: ${err}`);
    });
    this.queuedLightValue = pValue;

    if (this.settings.isStromStoss) {
      timeout = 3000;
      Utils.guardedTimeout(
        () => {
          if (this.room && this.room.PraesenzGroup?.anyPresent()) {
            this.setLight(true, -1, true);
          }
        },
        this.settings.stromStossResendTime * 1000,
        this,
      );
    }

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
          this.setLight(false, -1, true);
        } else {
          this.room.setLightTimeBased(true);
        }
      },
      timeout,
      this,
    );
  }

  public toggleLight(time?: TimeOfDay, force: boolean = false, calculateTime: boolean = false): boolean {
    const newVal = this.queuedLightValue !== null ? !this.queuedLightValue : !this.lightOn;
    const timeout: number = newVal && force ? 30 * 60 * 1000 : -1;
    if (newVal && time === undefined && calculateTime && this.room !== undefined) {
      time = TimeCallbackService.dayType(this.room?.settings.lampOffset);
    }
    if (newVal && time !== undefined) {
      this.setTimeBased(time, timeout, force);
      return true;
    }
    this.setLight(newVal, timeout, force);
    return newVal;
  }

  public setTimeBased(time: TimeOfDay, timeout: number = -1, force: boolean = false): void {
    if (
      (time === TimeOfDay.Night && this.settings.nightOn) ||
      (time === TimeOfDay.BeforeSunrise && this.settings.dawnOn) ||
      (time === TimeOfDay.AfterSunset && this.settings.duskOn)
    ) {
      this.setLight(true, timeout, force);
    }
  }

  public persist(): void {
    Utils.dbo?.persistLamp(this);
  }
}
