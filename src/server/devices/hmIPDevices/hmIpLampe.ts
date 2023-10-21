import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { LogDebugType, TimeCallbackService, Utils } from '../../services';
import { ActuatorSettings, CollisionSolving, LogLevel, TimeOfDay } from '../../../models';
import { iLamp, iTemporaryDisableAutomatic } from '../baseDeviceInterfaces';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler';

export class HmIpLampe extends HmIPDevice implements iLamp, iTemporaryDisableAutomatic {
  public lightOn: boolean = false;
  public queuedLightValue: boolean | null = null;
  public settings: ActuatorSettings = new ActuatorSettings();
  private lightOnSwitchID: string = '';
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  private _targetAutomaticState: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpLampe);
    this.deviceCapabilities.push(DeviceCapability.lamp);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
    this.lightOnSwitchID = `${this.info.fullID}.2.STATE`;
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
  }

  public get actuatorOn(): boolean {
    return this.lightOn;
  }

  public restoreTargetAutomaticValue(): void {
    this.log(LogLevel.Debug, `Restore Target Automatic value`);
    this.setActuator(this._targetAutomaticState);
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

  public setActuator(pValue: boolean, timeout?: number, force?: boolean): void {
    this.setLight(pValue, timeout, force);
  }

  public toggleActuator(force: boolean): boolean {
    return this.toggleLight(undefined, force);
  }

  /** @inheritdoc */
  public setLight(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    if (!force && this.blockAutomationHandler.automaticBlockActive) {
      this.log(
        LogLevel.Debug,
        `Skip automatic command to ${pValue} as it is locked until ${new Date(
          this.blockAutomationHandler.automaticBlockedUntil,
        ).toLocaleTimeString()}`,
      );
      this._targetAutomaticState = pValue;
      return;
    }

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

    this.log(LogLevel.Debug, `Set Light Acutator to "${pValue}"`, LogDebugType.SetActuator);
    this.setState(this.lightOnSwitchID, pValue, undefined, (err) => {
      this.log(LogLevel.Error, `Lampe schalten ergab Fehler: ${err}`);
    });
    this.queuedLightValue = pValue;

    if (this.settings.isStromStoss) {
      timeout = 3000;
      Utils.guardedTimeout(
        () => {
          if (this.room.PraesenzGroup?.anyPresent()) {
            this.setLight(true, -1, true);
          }
        },
        this.settings.stromStossResendTime * 1000,
        this,
      );
    }

    if (timeout < 0 || !pValue) {
      return;
    }

    if (timeout > -1) {
      this.blockAutomationHandler.disableAutomatic(timeout, CollisionSolving.overrideIfGreater);
    }
  }

  public toggleLight(time?: TimeOfDay, force: boolean = false, calculateTime: boolean = false): boolean {
    const newVal = this.queuedLightValue !== null ? !this.queuedLightValue : !this.lightOn;
    const timeout: number = newVal && force ? 30 * 60 * 1000 : -1;
    if (newVal && time === undefined && calculateTime) {
      time = TimeCallbackService.dayType(this.room.settings.lampOffset);
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
    Utils.dbo?.persistActuator(this);
  }
}
