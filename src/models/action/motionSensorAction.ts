import { CommandType } from '../command';
import { BaseAction } from './baseAction';
import { iMotionSensor } from '../../server';

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
