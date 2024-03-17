import {
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  CollisionSolving,
  DimmerSetLightCommand,
  DimmerSettings,
  LampSetTimeBasedCommand,
  LampToggleLightCommand,
  LogLevel,
  RestoreTargetAutomaticValueCommand,
} from '../../../../models';
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

  public restoreTargetAutomaticValue(c: RestoreTargetAutomaticValueCommand): void {
    this.setActuator(
      new ActuatorSetStateCommand(
        c,
        this.targetAutomaticState,
        'Restore targetAutomaticState due to BlockAutomaticHandler',
      ),
    );
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

  public setTimeBased(c: LampSetTimeBasedCommand): void {
    this.setLight(DimmerSetLightCommand.byTimeBased(this.settings, c));
  }

  public setActuator(c: ActuatorSetStateCommand): void {
    this.setLight(new DimmerSetLightCommand(c, c.on, 'Set dimmer due to set ActuactorCommand', c.timeout));
  }

  public toggleActuator(c: ActuatorToggleCommand): boolean {
    const setActuatorCommand: ActuatorSetStateCommand = ActuatorSetStateCommand.byActuatorAndToggleCommand(this, c);
    this.setActuator(setActuatorCommand);
    return setActuatorCommand.on;
  }

  /**
   * @inheritDoc
   */
  public setLight(c: DimmerSetLightCommand): void {
    if (this._stateIdState === '') {
      this.log(LogLevel.Error, `Keine State ID bekannt.`);
      return;
    }

    if (!this.ioConn) {
      this.log(LogLevel.Error, `Keine Connection bekannt.`);
      return;
    }

    const dontBlock: boolean = LampUtils.checkUnBlock(this, c);

    if (LampUtils.checkBlockActive(this, c)) {
      return;
    }

    if (c.transitionTime > -1) {
      this.setState(this._stateIdTransitionTime, c.transitionTime);
    }

    if (c.on && c.brightness <= 0 && this.brightness < 10) {
      c.brightness = 10;
    }
    this.log(LogLevel.Debug, c.logMessage, LogDebugType.SetActuator);
    if (c.timeout > -1 && !dontBlock) {
      this.blockAutomationHandler.disableAutomatic(c.timeout, CollisionSolving.overrideIfGreater);
    }
    if (SettingsService.settings.ioBroker?.useZigbee2mqtt && !c.on) {
      // With zigbee2mqtt to turn on only setting brighness>0 is needed, so we need state only for turning off
      this.writeActuatorStateToDevice(
        new ActuatorWriteStateToDeviceCommand(c, c.on, 'Set dimmer due to set ActuactorCommand'),
      );
      this.queuedValue = c.on;
      return;
    }

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

  public persist(): void {
    const now: number = Utils.nowMS();
    if (this._lastPersist + 1000 > now) {
      return;
    }
    Utils.dbo?.persistActuator(this);
    this._lastPersist = now;
  }

  public toggleLight(c: LampToggleLightCommand): boolean {
    return LampUtils.toggleLight(this, c);
  }

  public writeActuatorStateToDevice(c: ActuatorWriteStateToDeviceCommand): void {
    this.log(LogLevel.Debug, c.logMessage, LogDebugType.SetActuator);
    this.setState(this._stateIdState, c.stateValue);
  }

  private setBrightnessState(brightness: number, onSuccess?: () => void): void {
    this.setState(this._stateIdBrightness, Math.max(0, Math.min(brightness, 100)), onSuccess);
  }
}
