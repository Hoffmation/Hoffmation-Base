import { ShellyDevice } from './shellyDevice.js';
import { iActuator } from '../baseDeviceInterfaces/index.js';
import { BlockAutomaticHandler } from '../../services/blockAutomaticHandler.js';
import {
  ActuatorSetStateCommand,
  ActuatorSettings,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  LogLevel,
  RestoreTargetAutomaticValueCommand,
} from '../../../models/index.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';
import { DeviceType } from '../deviceType.js';
import { DeviceCapability } from '../DeviceCapability.js';
import { LampUtils } from '../sharedFunctions/index.js';
import { LogDebugType, Utils } from '../../services/index.js';

export class ShellyActuator extends ShellyDevice implements iActuator {
  /** @inheritDoc */
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  /** @inheritDoc */
  public targetAutomaticState: boolean = false;
  /** @inheritDoc */
  public settings: ActuatorSettings = new ActuatorSettings();
  /** @inheritDoc */
  public queuedValue: boolean | null = null;
  private _lastPersist: number = 0;
  private readonly _actuatorOnStateId: string;
  private _actuatorOn: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ShellyActuator);
    this.deviceCapabilities.push(DeviceCapability.actuator);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
    this._actuatorOnStateId = `${this.info.fullID}.Relay0.Switch`;
    this.blockAutomationHandler = new BlockAutomaticHandler(
      this.restoreTargetAutomaticValue.bind(this),
      this.log.bind(this),
    );
  }

  /** @inheritDoc */
  public get actuatorOn(): boolean {
    return this._actuatorOn;
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
    if (idSplit[3] === 'Relay0') {
      if (idSplit[4] === 'Switch') {
        this._actuatorOn = state.val as boolean;
        if (!initial) {
          this.persist();
        }
      }
    }
  }

  /** @inheritDoc */
  public setActuator(command: ActuatorSetStateCommand): void {
    if (this._actuatorOnStateId === '') {
      this.log(LogLevel.Error, 'Keine Switch ID bekannt.');
      return;
    }

    LampUtils.setActuator(this, command);
  }

  /** @inheritDoc */
  public persist(): void {
    const now: number = Utils.nowMS();
    if (this._lastPersist + 1000 > now) {
      return;
    }
    Utils.dbo?.persistActuator(this);
    this._lastPersist = now;
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
    this.setState(this._actuatorOnStateId, c.stateValue, undefined, (err) => {
      this.log(LogLevel.Error, `Lampe schalten ergab Fehler: ${err}`);
    });
  }
}
