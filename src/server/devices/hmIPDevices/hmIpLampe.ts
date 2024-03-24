import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { LogDebugType, Utils } from '../../services';
import {
  ActuatorSetStateCommand,
  ActuatorSettings,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  LampSetLightCommand,
  LampSetTimeBasedCommand,
  LampToggleLightCommand,
  LogLevel,
  RestoreTargetAutomaticValueCommand,
} from '../../../models';
import { iLamp, iTemporaryDisableAutomatic } from '../baseDeviceInterfaces';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler';
import { LampUtils } from '../sharedFunctions';

export class HmIpLampe extends HmIPDevice implements iLamp, iTemporaryDisableAutomatic {
  /** @inheritDoc */
  public lightOn: boolean = false;
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
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
  }

  public get actuatorOn(): boolean {
    return this.lightOn;
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
          this.lightOn = state.val as boolean;
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
      this.log(LogLevel.Error, "Keine Switch ID bekannt.");
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
    Utils.dbo?.persistActuator(this);
  }
}
