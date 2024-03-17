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

export class ZigbeeActuator extends ZigbeeDevice implements iActuator {
  private _actuatorOn: boolean = false;
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  public targetAutomaticState: boolean = false;

  public settings: ActuatorSettings = new ActuatorSettings();
  protected readonly actuatorOnSwitchID: string;
  public queuedValue: boolean | null = null;

  public get actuatorOn(): boolean {
    return this._actuatorOn;
  }

  public constructor(pInfo: IoBrokerDeviceInfo, type: DeviceType, actuatorOnSwitchID: string) {
    super(pInfo, type);
    this.deviceCapabilities.push(DeviceCapability.actuator);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
    this.actuatorOnSwitchID = actuatorOnSwitchID;
    this.blockAutomationHandler = new BlockAutomaticHandler(this.restoreTargetAutomaticValue.bind(this));
  }

  public restoreTargetAutomaticValue(c: RestoreTargetAutomaticValueCommand): void {
    this.log(LogLevel.Debug, `Restore Target Automatic value`);
    this.setActuator(new ActuatorSetStateCommand(c, this.targetAutomaticState, 'Restore Target Automatic value'));
  }

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

  public setActuator(command: ActuatorSetStateCommand): void {
    if (this.actuatorOnSwitchID === '') {
      this.log(LogLevel.Error, `Keine Switch ID bekannt.`);
      return;
    }

    LampUtils.setActuator(this, command);
  }

  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }

  public toggleActuator(command: ActuatorToggleCommand): boolean {
    const newVal = this.queuedValue !== null ? !this.queuedValue : !this._actuatorOn;
    const timeout: number = newVal && command.isForceAction ? 30 * 60 * 1000 : -1;
    this.setActuator(new ActuatorSetStateCommand(command, newVal, 'Due to ZigbeeActuatorToggle', timeout));
    return newVal;
  }

  public writeActuatorStateToDevice(c: ActuatorWriteStateToDeviceCommand): void {
    this.log(LogLevel.Debug, c.logMessage, LogDebugType.SetActuator);
    this.setState(this.actuatorOnSwitchID, c.stateValue, undefined, (err) => {
      this.log(LogLevel.Error, `Lampe schalten ergab Fehler: ${err}`);
    });
  }
}
