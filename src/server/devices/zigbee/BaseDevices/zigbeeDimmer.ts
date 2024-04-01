import {
  ActuatorWriteStateToDeviceCommand,
  BlockAutomaticCommand,
  DimmerSetLightCommand,
  DimmerSettings,
  LampSetTimeBasedCommand,
  LogLevel,
} from '../../../../models';
import { DeviceType } from '../../deviceType';
import { LogDebugType, SettingsService, Utils } from '../../../services';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { DeviceCapability } from '../../DeviceCapability';
import { iDimmableLamp } from '../../baseDeviceInterfaces/iDimmableLamp';
import { iTemporaryDisableAutomatic } from '../../baseDeviceInterfaces';
import { LampUtils } from '../../sharedFunctions';
import { ZigbeeLamp } from './zigbeeLamp';

export abstract class ZigbeeDimmer extends ZigbeeLamp implements iDimmableLamp, iTemporaryDisableAutomatic {
  /** @inheritDoc */
  public settings: DimmerSettings = new DimmerSettings();
  protected abstract readonly _stateIdBrightness: string;
  protected abstract readonly _stateIdTransitionTime: string;
  protected abstract readonly _stateNameBrightness: string;
  protected abstract readonly _stateNameTransitionTime: string;

  protected constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType) {
    super(pInfo, deviceType);
    this.deviceCapabilities.push(DeviceCapability.lamp);
    this.deviceCapabilities.push(DeviceCapability.dimmablelamp);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
  }

  protected _brightness: number = 0;

  /** @inheritDoc */
  public get brightness(): number {
    return this._brightness;
  }

  protected _transitionTime: number = 0;

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.queuedValue = null;
    this.log(LogLevel.DeepTrace, `Dimmer Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
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

  /** @inheritDoc */
  public setTimeBased(c: LampSetTimeBasedCommand): void {
    this.setLight(DimmerSetLightCommand.byTimeBased(this.settings, c));
  }

  /** @inheritDoc */
  public setLight(c: DimmerSetLightCommand): void {
    if (this._stateIdState === '') {
      this.log(LogLevel.Error, 'Keine State ID bekannt.');
      return;
    }

    if (!this.ioConn) {
      this.log(LogLevel.Error, 'Keine Connection bekannt.');
      return;
    }

    const dontBlock: boolean = LampUtils.checkUnBlock(this, c);

    if (LampUtils.checkBlockActive(this, c)) {
      return;
    }

    if (LampUtils.checkDimmerUnchanged(this, c)) {
      return;
    }
    if (c.isAutomaticAction) {
      // Preserve the target state for the automatic handler, as
      this.targetAutomaticState = c.on;
    }

    if (c.transitionTime > -1) {
      this.setState(this._stateIdTransitionTime, c.transitionTime);
    }

    if (c.on && c.brightness <= 0 && this.brightness < 10) {
      c.brightness = 10;
    }

    if (!dontBlock && c.disableAutomaticCommand !== null) {
      if (c.disableAutomaticCommand === undefined && c.isForceAction) {
        c.disableAutomaticCommand = BlockAutomaticCommand.fromDeviceSettings(c, this.settings);
      }
      if (c.disableAutomaticCommand) {
        this.blockAutomationHandler.disableAutomatic(c.disableAutomaticCommand);
      }
    }

    if (SettingsService.settings.ioBroker?.useZigbee2mqtt && !c.on) {
      // With zigbee2mqtt to turn on only setting brighness>0 is needed, so we need state only for turning off
      this.writeActuatorStateToDevice(new ActuatorWriteStateToDeviceCommand(c, c.on));
      this.queuedValue = c.on;
      return;
    }

    this.log(LogLevel.Debug, c.logMessage, LogDebugType.SetActuator);
    if (c.brightness >= this.settings.turnOnThreshhold) {
      this.setBrightnessState(c.brightness);
      return;
    }

    this.setBrightnessState(this.settings.turnOnThreshhold, () => {
      Utils.guardedTimeout(
        () => {
          this.log(LogLevel.Info, `Delayed reduced brightness on ${this.info.customName}`);
          this.setBrightnessState(c.brightness);
        },
        1000,
        this,
      );
    });
  }

  private setBrightnessState(brightness: number, onSuccess?: () => void): void {
    this.setState(this._stateIdBrightness, Math.max(0, Math.min(brightness, 100)), onSuccess);
  }
}
