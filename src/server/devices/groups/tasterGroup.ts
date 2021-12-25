import { HmIpTaster } from '../hmIPDevices/hmIpTaster';
import { BaseGroup } from './base-group';
import { DeviceClusterType } from '../device-cluster-type';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';
import { SonosGroup } from './sonosGroup';

export class TasterGroup extends BaseGroup {
  public getButtons(): HmIpTaster[] {
    return this.deviceCluster.getIoBrokerDevicesByType(DeviceClusterType.Buttons) as HmIpTaster[];
  }

  public constructor(roomName: string, buttonIds: string[]) {
    super(roomName, GroupType.Buttons);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Buttons, new DeviceList(buttonIds));
  }

  public initCallbacks(): void {
    this.getButtons().forEach((t) => {
      t.tasten.ObenLinks.addLongCallback((pValue) => {
        pValue && this.getRoom().FensterGroup?.allRolloDown(false, true);
      }, `Close all Rollos in this room`);

      t.tasten.ObenLinks.addShortCallback((pValue) => {
        pValue && this.getRoom().FensterGroup?.allRolloToLevel(25, true);
      }, `Nearly closes all Rollos in this room`);

      t.tasten.ObenRechts.addLongCallback((pValue) => {
        if (!pValue) {
          return;
        }

        this.getRoom().FensterGroup?.allRolloUp(true);
      }, `Open all Rollos in this room`);

      t.tasten.ObenRechts.addShortCallback((pValue) => {
        pValue && this.getRoom().FensterGroup?.allRolloToLevel(50, true);
      }, `All Rollos in this room to middle`);

      t.tasten.MitteLinks.addLongCallback((pValue) => {
        pValue && this.getRoom().LampenGroup?.switchAll(true, true);
      }, `Turn all Lights in this room on`);

      t.tasten.MitteRechts.addLongCallback((pValue) => {
        pValue && this.getRoom().LampenGroup?.switchAll(false, true);
      }, `Turn all Lights in this room off`);

      const sonosGroup: SonosGroup | undefined = this.getRoom().SonosGroup;
      if (sonosGroup !== undefined && sonosGroup.getOwnSonosDevices().length > 0) {
        t.tasten.UntenRechts.addLongCallback(() => {
          sonosGroup.trigger(this.getRoom().settings.radioUrl);
        });
      }
    });
  }
}
