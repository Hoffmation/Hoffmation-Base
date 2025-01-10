import { BaseAction } from './baseAction';
import { CommandType } from '../enums';
import { iActuator } from '../interfaces';

export class ActuatorChangeAction extends BaseAction {
  /** @inheritDoc */
  public type: CommandType = CommandType.ActuatorChangeAction;
  /**
   * The new state
   * @type {boolean}
   */
  public readonly actuatorOn: boolean;

  public constructor(device: iActuator) {
    super(undefined, `New Actuator state (${device.actuatorOn}) received`);
    this.actuatorOn = device.actuatorOn;
  }
}
