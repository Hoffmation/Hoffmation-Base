import { AcDevice } from '../../services';
import { BaseGroup } from './base-group';
import { DeviceClusterType } from '../device-cluster-type';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';

export class AcGroup extends BaseGroup {
  public constructor(roomName: string, acIds: string[]) {
    super(roomName, GroupType.Ac);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Ac, new DeviceList(acIds));
  }

  public getOwnAcDevices(): AcDevice[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Ac) as AcDevice[];
  }

  /**
   * Sets all ACs to new desired Value
   * @param {boolean} newDesiredState
   * @param {boolean} force Whether this was a manual trigger, thus blocking automatic changes for 1 hour
   */
  public setAc(newDesiredState: boolean, force: boolean = false): void {
    for (const dev of this.getOwnAcDevices()) {
      if (newDesiredState) {
        dev.turnOn();
        continue;
      }
      if (force) {
        dev.deactivateAutomaticTurnOn(60 * 60 * 1000);
        continue;
      }
      dev.turnOff();
    }
  }
}
