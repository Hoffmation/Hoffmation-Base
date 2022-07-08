import { OwnDaikinDevice } from '../../services';
import { BaseGroup } from './base-group';
import { DeviceClusterType } from '../device-cluster-type';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';

export class AcGroup extends BaseGroup {
  public constructor(roomName: string, acIds: string[]) {
    super(roomName, GroupType.Ac);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Ac, new DeviceList(acIds));
  }

  public getOwnAcDevices(): OwnDaikinDevice[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Ac) as OwnDaikinDevice[];
  }
}
