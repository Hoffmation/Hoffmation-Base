import { iBaseGroup } from './iBaseGroup';
import { iWaterSensor } from '../baseDevices';

export interface iWaterGroup extends iBaseGroup {
  getWaterDetectors(): iWaterSensor[];

  stopAlarm(timeout?: number): void;
}
