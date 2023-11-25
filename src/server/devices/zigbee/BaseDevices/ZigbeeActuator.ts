import { LogDebugType, Utils } from '../../../services';
import { ActuatorSettings, CollisionSolving, LogLevel } from '../../../../models';
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

  public restoreTargetAutomaticValue(): void {
    this.log(LogLevel.Debug, `Restore Target Automatic value`);
    this.setActuator(this.targetAutomaticState);
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

  public setActuator(pValue: boolean, timeout: number = -1, force: boolean = false): void {
    if (this.actuatorOnSwitchID === '') {
      this.log(LogLevel.Error, `Keine Switch ID bekannt.`);
      return;
    }

    const dontBlock: boolean = LampUtils.checkUnBlock(this, force, pValue);

    if (LampUtils.checkBlockActive(this, force, pValue)) {
      return;
    }

    if (LampUtils.checkUnchanged(this, force, pValue)) {
      return;
    }

    this.log(LogLevel.Debug, `Set Acutator to "${pValue}"`, LogDebugType.SetActuator);
    this.setState(this.actuatorOnSwitchID, pValue, undefined, (err) => {
      this.log(LogLevel.Error, `Switching actuator resulted in error: ${err}`);
    });
    this.queuedValue = pValue;
    if (timeout > -1 && !dontBlock) {
      this.blockAutomationHandler.disableAutomatic(timeout, CollisionSolving.overrideIfGreater);
    }
  }

  public persist(): void {
    Utils.dbo?.persistActuator(this);
  }

  public toggleActuator(force: boolean = false): boolean {
    const newVal = this.queuedValue !== null ? !this.queuedValue : !this._actuatorOn;
    const timeout: number = newVal && force ? 30 * 60 * 1000 : -1;
    this.setActuator(newVal, timeout, force);
    return newVal;
  }
}
