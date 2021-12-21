import { GroupType } from './group-type';
import { DeviceCluster } from '../device-cluster';

export class BaseGroup {
  public constructor(public type: GroupType, public deviceCluster: DeviceCluster) {}
}
