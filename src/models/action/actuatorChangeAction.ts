import { BaseAction } from './baseAction';
import { CommandType } from '../command';
import { iActuator } from '../../server';

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
