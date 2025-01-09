import { CommandType } from '../command/index.js';
import { BaseAction } from './baseAction.js';
import { iMotionSensor } from '../../server/index.js';

export class MotionSensorAction extends BaseAction {
  /** @inheritDoc */
  public type: CommandType = CommandType.MotionSensorAction;
  /**
   * Whether motion was detected or cleared. (True = detected, False = cleared)
   */
  public readonly motionDetected: boolean;
  /**
   * The motion sensor that triggered the action
   */
  public readonly sensor: iMotionSensor;

  public constructor(sensor: iMotionSensor) {
    super(undefined, `${sensor.customName} ${sensor.movementDetected ? 'detected' : 'cleared'} motion`);
    this.motionDetected = sensor.movementDetected;
    this.sensor = sensor;
  }
}
