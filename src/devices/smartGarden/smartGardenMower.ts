import {
  ActuatorSetStateCommand,
  ActuatorToggleCommand,
  ActuatorWriteStateToDeviceCommand,
  RestoreTargetAutomaticValueCommand,
} from '../../command';
import { ActuatorSettings } from '../deviceSettings';
import { SmartGardenDevice } from './smartGardenDevice';
import { iActuator } from '../../interfaces';
import { BlockAutomaticHandler } from '../../services';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability, DeviceType, LogLevel } from '../../enums';
import { LampUtils } from '../sharedFunctions';
import { Utils } from '../../utils';

export class SmartGardenMower extends SmartGardenDevice implements iActuator {
  /** @inheritDoc */
  public readonly blockAutomationHandler: BlockAutomaticHandler;
  /** @inheritDoc */
  public targetAutomaticState: boolean = false;
  /** @inheritDoc */
  public settings: ActuatorSettings = new ActuatorSettings();
  /** @inheritDoc */
  public queuedValue: boolean | null = null;
  private _lastPersist: number = 0;
  private readonly _activityControlStateId: string;
  private _actuatorOn: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.SmartGardenMower);
    this._activityControlStateId = `${pInfo.fullID}.SERVICE_MOWER_${this._deviceSerial}.activity_control_i`;
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
    if (folder.indexOf('SERVICE_MOWER') === 0) {
      switch (stateName) {
        case 'activity_mowing_i':
          this._actuatorOn = state.val as boolean;
          this.persist();
          break;
      }
    }
  }

  /** @inheritDoc */
  public setActuator(command: ActuatorSetStateCommand): void {
    if (this._activityControlStateId === '') {
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
      this.park();
      return;
    }
    // TODO: Add settings for duration
    this.mov(4 * 60 * 60);
  }

  private park(pauseGardenaPlan: boolean = true): void {
    if (pauseGardenaPlan) {
      this.log(LogLevel.Info, 'Pausing Gardena Plan');
      this.setState(this._activityControlStateId, 'PARK_UNTIL_FURTHER_NOTICE', undefined, (err) => {
        this.log(LogLevel.Error, `Pausing gardena mower resulted in error: ${err}`);
      });
      return;
    }
    this.log(LogLevel.Info, 'Pausing until next task');
    this.setState(this._activityControlStateId, 'PARK_UNTIL_NEXT_TASK', undefined, (err) => {
      this.log(LogLevel.Error, `Pausing gardena mower resulted in error: ${err}`);
    });
  }

  private mov(durationInSeconds: number): void {
    this.log(LogLevel.Info, `Start moving for ${durationInSeconds} seconds`);
    this.setState(this._activityControlStateId, durationInSeconds.toString(10), undefined, (err) => {
      this.log(LogLevel.Error, `Starting gardena mower resulted in error: ${err}`);
    });
  }
}
