import { CollisionSolving, DimmerSettings, LogLevel, TimeOfDay } from '../../../../models';
import { DeviceType } from '../../deviceType';
import { LogDebugType, SettingsService, Utils } from '../../../services';
import { ZigbeeDevice } from './index';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { DeviceCapability } from '../../DeviceCapability';
import { iDimmableLamp } from '../../baseDeviceInterfaces/iDimmableLamp';
import { iTemporaryDisableAutomatic } from '../../baseDeviceInterfaces';
import { BlockAutomaticHandler } from '../../../services/blockAutomaticHandler';
import { LampUtils } from '../../sharedFunctions';

export abstract class ZigbeeDimmer extends ZigbeeDevice implements iDimmableLamp, iTemporaryDisableAutomatic {
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  public queuedValue: boolean | null = null;
  public settings: DimmerSettings = new DimmerSettings();
  public targetAutomaticState: boolean = false;
  protected _lastPersist: number = 0;
  protected abstract readonly _stateIdBrightness: string;
  protected abstract readonly _stateIdState: string;
  protected abstract readonly _stateIdTransitionTime: string;
  protected abstract readonly _stateNameBrightness: string;
  protected abstract readonly _stateNameState: string;
  protected abstract readonly _stateNameTransitionTime: string;

  protected constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType) {
    super(pInfo, deviceType);
    this.deviceCapabilities.push(DeviceCapability.lamp);
    this.deviceCapabilities.push(DeviceCapability.dimmablelamp);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
  }

  protected _brightness: number = 0;

  public get brightness(): number {
    return this._brightness;
  }

  protected _lightOn: boolean = false;

  public get lightOn(): boolean {
    return this._lightOn;
  }

  protected _transitionTime: number = 0;

  public get transitionTime(): number {
    return this._transitionTime;
  }

  public get actuatorOn(): boolean {
    return this.lightOn;
  }

  public restoreTargetAutomaticValue(): void {
    this.log(LogLevel.Debug, `Restore Target Automatic value`);
    this.setActuator(this.targetAutomaticState);
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
      this.setState(this._stateIdTransitionTime, transitionTime);
    }

    const dontBlock: boolean = LampUtils.checkUnBlock(this, force, pValue);

    if (LampUtils.checkBlockActive(this, force, pValue)) {
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
    if (timeout > -1 && !dontBlock) {
      this.blockAutomationHandler.disableAutomatic(timeout, CollisionSolving.overrideIfGreater);
    }
    if (SettingsService.settings.ioBroker?.useZigbee2mqtt && !pValue) {
      // With zigbee2mqtt to turn on only setting brighness>0 is needed, so we need state only for turning off
      this.setState(this._stateIdState, pValue);
      this.queuedValue = pValue;
      return;
    }

    if (brightness >= this.settings.turnOnThreshhold) {
      this.setState(this._stateIdBrightness, brightness);
      return;
    }

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
    return LampUtils.toggleLight(this, time, force, calculateTime);
  }
}
