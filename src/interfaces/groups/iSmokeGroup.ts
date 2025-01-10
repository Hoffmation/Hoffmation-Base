import { iBaseGroup } from './iBaseGroup';
import { iSmokeDetectorDevice } from '../baseDevices';

export interface iSmokeGroup extends iBaseGroup {
  getSmokeDetectors(): iSmokeDetectorDevice[];

  stopAlarm(): void;
}
