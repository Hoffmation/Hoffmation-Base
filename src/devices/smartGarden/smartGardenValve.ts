import {
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  RestoreTargetAutomaticValueCommand,
} from '../../command';
import { SmartGardenDevice } from './smartGardenDevice';
import { iActuator } from '../../interfaces';
import { BlockAutomaticHandler } from '../../services';
import { ActuatorSettings } from '../deviceSettings';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability, DeviceType, LogLevel } from '../../enums';
import { LampUtils } from '../sharedFunctions';
import { Utils } from '../../utils';

// TODO: Add iValve interface and DeviceCapability
export class SmartGardenValve extends SmartGardenDevice implements iActuator {
  /** @inheritDoc */
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  /** @inheritDoc */
  public targetAutomaticState: boolean = false;
  /** @inheritDoc */
  public settings: ActuatorSettings = new ActuatorSettings();
  /** @inheritDoc */
  public queuedValue: boolean | null = null;
  private _lastPersist: number = 0;
  private readonly _durationValueStateId: string;
  private readonly _stopAllValvesStateId: string;
  private _actuatorOn: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.SmartGardenValve);
    this._durationValueStateId = `${pInfo.fullID}.SERVICE_VALVE_${this._deviceSerial}.duration_value`;
    this._stopAllValvesStateId = `${pInfo.fullID}.SERVICE_VALVE_SET_${this._deviceSerial}.stop_all_valves_i`;
    this.deviceCapabilities.push(DeviceCapability.actuator);
    this.deviceCapabilities.push(DeviceCapability.blockAutomatic);
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
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.queuedValue = null;
    super.update(idSplit, state, initial, true);
    if (idSplit.length < 6) {
      return;
    }
    const folder: string = idSplit[4];
    const stateName: string = idSplit[5];
    if (folder.indexOf('SERVICE_VALVE') === 0) {
      switch (stateName) {
        case 'activity_value':
          this._actuatorOn = (state.val as string) !== 'CLOSED';
          this.persist();
          break;
      }
    }
  }

  /** @inheritDoc */
  public setActuator(command: ActuatorSetStateCommand): void {
    if (this._durationValueStateId === '') {
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
    this.dbo?.persistActuator(this);
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
    if (!c.stateValue) {
      this.stopIrrigation();
      return;
    }
    // TODO: Add settings for duration
    this.irrigate(15 * 60);
  }

  private stopIrrigation(): void {
    this.log(LogLevel.Info, 'Stopping irrigation until next task');
    this.setState(this._stopAllValvesStateId, 'STOP_UNTIL_NEXT_TASK', undefined, (err) => {
      this.log(LogLevel.Error, `Stopping irrigation immediately resulted in error: ${err}`);
    });
    this.setState(this._durationValueStateId, 'STOP_UNTIL_NEXT_TASK', undefined, (err) => {
      this.log(LogLevel.Error, `Prevent irrigation restart resulted in error: ${err}`);
    });
  }

  private irrigate(durationInSeconds: number): void {
    this.log(LogLevel.Info, `Start irrigation for ${durationInSeconds} seconds`);
    this.setState(this._durationValueStateId, durationInSeconds.toString(10), undefined, (err) => {
      this.log(LogLevel.Error, `Starting irrigation resulted in error: ${err}`);
    });
  }
}
