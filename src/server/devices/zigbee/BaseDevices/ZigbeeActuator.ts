import { LogDebugType, Utils } from '../../../services';
import {
  ActuatorSetStateCommand,
  ActuatorSettings,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  LogLevel,
  RestoreTargetAutomaticValueCommand,
} from '../../../../models';
import { DeviceType } from '../../deviceType';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { iActuator } from '../../baseDeviceInterfaces';
import { ZigbeeDevice } from './zigbeeDevice';
import { DeviceCapability } from '../../DeviceCapability';
import { BlockAutomaticHandler } from '../../../services/blockAutomaticHandler';
import { LampUtils } from '../../sharedFunctions';

export abstract class ZigbeeActuator extends ZigbeeDevice implements iActuator {
  private _actuatorOn: boolean = false;
  /** @inheritDoc */
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  /** @inheritDoc */
  public targetAutomaticState: boolean = false;

  /** @inheritDoc */
  public settings: ActuatorSettings = new ActuatorSettings();
  protected abstract readonly _stateIdState: string;
  /** @inheritDoc */
  public queuedValue: boolean | null = null;

  /** @inheritDoc */
  public get actuatorOn(): boolean {
    return this._actuatorOn;
  }

  public constructor(pInfo: IoBrokerDeviceInfo, type: DeviceType) {
    super(pInfo, type);
    this.deviceCapabilities.push(DeviceCapability.actuator);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
  }

  /** @inheritDoc */
  public restoreTargetAutomaticValue(c: RestoreTargetAutomaticValueCommand): void {
    this.setActuator(new ActuatorSetStateCommand(c, this.targetAutomaticState));
  }

  /** @inheritDoc */
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
        if (!handledByChildObject) {
          this.log(LogLevel.Trace, `Aktor Update für ${this.info.customName} auf ${state.val}`);
        }
        this._actuatorOn = state.val as boolean;
        this.persist();
        break;
    }
  }

  /** @inheritDoc */
  public setActuator(command: ActuatorSetStateCommand): void {
    if (this._stateIdState === '') {
      this.log(LogLevel.Error, 'Keine Switch ID bekannt.');
      return;
    }

    LampUtils.setActuator(this, command);
  }

  /** @inheritDoc */
  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }

  /** @inheritDoc */
  public toggleActuator(command: ActuatorToggleCommand): boolean {
    const newVal = this.queuedValue !== null ? !this.queuedValue : !this._actuatorOn;
    const setStateCommand: ActuatorSetStateCommand = ActuatorSetStateCommand.byActuatorAndToggleCommand(this, command);
    this.setActuator(setStateCommand);
    return newVal;
  }

  /** @inheritDoc */
  public writeActuatorStateToDevice(c: ActuatorWriteStateToDeviceCommand): void {
    this.log(LogLevel.Debug, c.logMessage, LogDebugType.SetActuator);
    this.setState(this._stateIdState, c.stateValue, undefined, (err) => {
      this.log(LogLevel.Error, `Lampe schalten ergab Fehler: ${err}`);
    });
  }
}
