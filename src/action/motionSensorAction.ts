import { BaseAction } from './baseAction';
import { CommandType } from '../enums';
import { iMotionSensor } from '../interfaces';

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
