import { BaseAction } from './baseAction.js';
import { CommandType } from '../command/index.js';
import { iActuator } from '../../server/index.js';

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
