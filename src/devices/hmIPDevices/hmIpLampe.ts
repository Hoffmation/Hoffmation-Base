import {
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  LampSetLightCommand,
  LampSetTimeBasedCommand,
  LampToggleLightCommand,
  RestoreTargetAutomaticValueCommand,
} from '../../models/command';
import { HmIPDevice } from './hmIpDevice';
import { iLamp, iTemporaryDisableAutomatic } from '../../interfaces';
import { ActuatorSettings } from '../deviceSettings';
import { BlockAutomaticHandler } from '../../services';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability, DeviceType, LogDebugType, LogLevel } from '../../enums';
import { LampUtils } from '../sharedFunctions';

export class HmIpLampe extends HmIPDevice implements iLamp, iTemporaryDisableAutomatic {
  /** @inheritDoc */
  private _actuatorOn: boolean = false;
  /** @inheritDoc */
  public settings: ActuatorSettings = new ActuatorSettings();
  private lightOnSwitchID: string = '';
  /** @inheritDoc */
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  /** @inheritDoc */
  public queuedValue: boolean | null = null;
  /** @inheritDoc */
  public targetAutomaticState: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpLampe);
    this.deviceCapabilities.push(DeviceCapability.lamp);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
    this.lightOnSwitchID = `${this.info.fullID}.2.STATE`;
    this.blockAutomationHandler = new BlockAutomaticHandler(
      this.restoreTargetAutomaticValue.bind(this),
      this.log.bind(this),
    );
  }

  public get actuatorOn(): boolean {
    return this._actuatorOn;
  }

  public restoreTargetAutomaticValue(c: RestoreTargetAutomaticValueCommand): void {
    this.setLight(new LampSetLightCommand(c, this.targetAutomaticState));
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Lampen Update : ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    this.queuedValue = null;
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case '1':
        if (idSplit[4] === 'STATE') {
          this._actuatorOn = state.val as boolean;
          this.persist();
        }
        break;
    }
  }

  public setActuator(command: ActuatorSetStateCommand): void {
    this.setLight(command);
  }

  public toggleActuator(c: ActuatorToggleCommand): boolean {
    const setActuatorCommand: ActuatorSetStateCommand = ActuatorSetStateCommand.byActuatorAndToggleCommand(this, c);
    this.setActuator(setActuatorCommand);
    return setActuatorCommand.on;
  }

  /** @inheritdoc */
  public setLight(c: LampSetLightCommand): void {
    if (this.lightOnSwitchID === '') {
      this.log(LogLevel.Error, 'Keine Switch ID bekannt.');
      return;
    }
    LampUtils.setActuator(this, c);
  }

  public writeActuatorStateToDevice(c: ActuatorWriteStateToDeviceCommand): void {
    this.log(LogLevel.Debug, c.logMessage, LogDebugType.SetActuator);
    this.setState(this.lightOnSwitchID, c.stateValue, undefined, (err) => {
      this.log(LogLevel.Error, `Lampe schalten ergab Fehler: ${err}`);
    });
  }

  public toggleLight(c: LampToggleLightCommand): boolean {
    return LampUtils.toggleLight(this, c);
  }

  public setTimeBased(c: LampSetTimeBasedCommand): void {
    LampUtils.setTimeBased(this, c);
  }

  public persist(): void {
    this.dbo?.persistActuator(this);
  }
}
