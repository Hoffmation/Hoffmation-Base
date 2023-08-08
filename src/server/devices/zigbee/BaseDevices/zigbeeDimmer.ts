import { CollisionSolving, DimmerSettings, LogLevel, TimeOfDay } from '../../../../models';
import { DeviceType } from '../../deviceType';
import { LogDebugType, TimeCallbackService, Utils } from '../../../services';
import { ZigbeeDevice } from './index';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { DeviceCapability } from '../../DeviceCapability';
import { iDimmableLamp } from '../../baseDeviceInterfaces/iDimmableLamp';
import { iTemporaryDisableAutomatic } from '../../baseDeviceInterfaces';
import { BlockAutomaticHandler } from '../../../services/blockAutomaticHandler';

export abstract class ZigbeeDimmer extends ZigbeeDevice implements iDimmableLamp, iTemporaryDisableAutomatic {
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  public queuedValue: boolean | null = null;
  public settings: DimmerSettings = new DimmerSettings();
  protected _brightness: number = 0;
  protected _lastPersist: number = 0;
  protected _lightOn: boolean = false;
  protected _transitionTime: number = 0;
  protected _targetAutomaticState: boolean = false;
  protected abstract readonly _stateIdBrightness: string;
  protected abstract readonly _stateIdState: string;
  protected abstract readonly _stateIdTransitionTime: string;
  protected abstract readonly _stateNameBrightness: string;
  protected abstract readonly _stateNameState: string;
  protected abstract readonly _stateNameTransitionTime: string;

  public get lightOn(): boolean {
    return this._lightOn;
  }

  public get brightness(): number {
    return this._brightness;
  }

  public get transitionTime(): number {
    return this._transitionTime;
  }

  public get actuatorOn(): boolean {
    return this.lightOn;
  }

  protected constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType) {
    super(pInfo, deviceType);
    this.deviceCapabilities.push(DeviceCapability.lamp);
    this.deviceCapabilities.push(DeviceCapability.dimmablelamp);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
  }

  public restoreTargetAutomaticValue(): void {
    this.log(LogLevel.Debug, `Restore Target Automatic value`);
    this.setActuator(this._targetAutomaticState);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.queuedValue = null;
    this.log(LogLevel.DeepTrace, `Dimmer Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case this._stateNameState:
        this.log(LogLevel.Trace, `Dimmer Update für ${this.info.customName} auf ${state.val}`);
        this._lightOn = state.val as boolean;
        this.persist();
        break;
      case this._stateNameBrightness:
        this.log(LogLevel.Trace, `Dimmer Helligkeit Update für ${this.info.customName} auf ${state.val}`);
        this._brightness = state.val as number;
        this.persist();
        break;
      case this._stateNameTransitionTime:
        this.log(LogLevel.Trace, `Dimmer Transition Time Update für ${this.info.customName} auf ${state.val}`);
        this._transitionTime = state.val as number;
        break;
    }
  }

  public setTimeBased(time: TimeOfDay, timeout: number = -1, force: boolean = false): void {
    switch (time) {
      case TimeOfDay.Night:
        this.setLight(true, timeout, force, this.settings.nightBrightness);
        break;
      case TimeOfDay.AfterSunset:
        this.setLight(true, timeout, force, this.settings.dawnBrightness);
        break;
      case TimeOfDay.BeforeSunrise:
        this.setLight(true, timeout, force, this.settings.duskBrightness);
        break;
      case TimeOfDay.Daylight:
        this.setLight(true, timeout, force, this.settings.dayBrightness);
        break;
    }
  }

  public setActuator(pValue: boolean, timeout?: number, force?: boolean): void {
    this.setLight(pValue, timeout, force);
  }

  public toggleActuator(force: boolean): boolean {
    return this.toggleLight(undefined, force);
  }

  /**
   * @inheritDoc
   * @param pValue The desired value
   * @param timeout If > 0 time at which this should be turned off again
   * @param force if it is an user based action which should override automatic ones
   * @param {number} brightness The desired brightness in percent
   * @param {number} transitionTime The transition time for the brightness, to switch smoothly
   */
  public setLight(
    pValue: boolean,
    timeout: number = -1,
    force: boolean = false,
    brightness: number = -1,
    transitionTime: number = -1,
  ): void {
    if (this._stateIdState === '') {
      this.log(LogLevel.Error, `Keine State ID bekannt.`);
      return;
    }

    if (!this.ioConn) {
      this.log(LogLevel.Error, `Keine Connection bekannt.`);
      return;
    }

    if (transitionTime > -1) {
      this.ioConn.setState(this._stateIdTransitionTime, transitionTime, (err) => {
        if (err) {
          this.log(LogLevel.Error, `Dimmer TransitionTime schalten ergab Fehler: ${err}`);
        }
      });
    }

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

    if (pValue && brightness === -1 && this.brightness < 10) {
      brightness = 10;
    }
    this.log(
      LogLevel.Debug,
      `Set Light Acutator to "${pValue}" with brightness ${brightness}`,
      LogDebugType.SetActuator,
    );
    this.setState(this._stateIdState, pValue);
    this.queuedValue = pValue;

    if (brightness > -1) {
      if (brightness < this.settings.turnOnThreshhold) {
        this.setState(this._stateIdBrightness, this.settings.turnOnThreshhold, () => {
          Utils.guardedTimeout(
            () => {
              this.log(LogLevel.Info, `Delayed reduced brightness on ${this.info.customName}`);
              this.setState(this._stateIdBrightness, brightness);
            },
            1000,
            this,
          );
        });
      } else {
        this.setState(this._stateIdBrightness, brightness);
      }
    }
    if (timeout > -1) {
      this.blockAutomationHandler.disableAutomatic(timeout, CollisionSolving.overrideIfGreater);
    }
  }

  public persist(): void {
    const now: number = Utils.nowMS();
    if (this._lastPersist + 1000 > now) {
      return;
    }
    Utils.dbo?.persistActuator(this);
    this._lastPersist = now;
  }

  public toggleLight(time?: TimeOfDay, force: boolean = false, calculateTime: boolean = false): boolean {
    const newVal = this.queuedValue !== null ? !this.queuedValue : !this.lightOn;
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
}
