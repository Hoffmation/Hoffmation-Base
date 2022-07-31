import { BaseGroup } from './base-group';
import { DeviceClusterType } from '../device-cluster-type';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';
import { SonosGroup } from './sonosGroup';
import { iButtonSwitch } from '../baseDeviceInterfaces';
import { SettingsService } from '../../services';
import { HeatGroup } from './heatGroup';
import { ButtonPressType } from '../button';

export class TasterGroup extends BaseGroup {
  public constructor(roomName: string, buttonIds: string[]) {
    super(roomName, GroupType.Buttons);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Buttons, new DeviceList(buttonIds));
  }

  public getButtons(): iButtonSwitch[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Buttons) as iButtonSwitch[];
  }

  public initCallbacks(): void {
    this.getButtons().forEach((t) => {
      t.buttonTopLeft?.addCb(
        ButtonPressType.long,
        (pValue) => {
          pValue && this.getRoom().FensterGroup?.allRolloDown(false, true);
        },
        `Close all Rollos in this room`,
      );

      t.buttonTopLeft?.addCb(
        ButtonPressType.short,
        (pValue) => {
          pValue && this.getRoom().FensterGroup?.allRolloToLevel(25, true);
        },
        `Nearly closes all Rollos in this room`,
      );

      t.buttonTopRight?.addCb(
        ButtonPressType.long,
        (pValue) => {
          if (!pValue) {
            return;
          }

          this.getRoom().FensterGroup?.allRolloUp(true);
        },
        `Open all Rollos in this room`,
      );

      t.buttonTopRight?.addCb(
        ButtonPressType.short,
        (pValue) => {
          pValue && this.getRoom().FensterGroup?.allRolloToLevel(50, true);
        },
        `All Rollos in this room to middle`,
      );

      t.buttonMidLeft?.addCb(
        ButtonPressType.long,
        (pValue) => {
          pValue && this.getRoom().LampenGroup?.switchAll(true, true);
        },
        `Turn all Lights in this room on`,
      );

      t.buttonMidRight?.addCb(
        ButtonPressType.long,
        (pValue) => {
          pValue && this.getRoom().LampenGroup?.switchAll(false, true);
        },
        `Turn all Lights in this room off`,
      );

      if (SettingsService.settings.sonos?.buttonBotRightForRadio === true) {
        const sonosGroup: SonosGroup | undefined = this.getRoom().SonosGroup;
        if (sonosGroup !== undefined && sonosGroup.getOwnSonosDevices().length > 0) {
          t.buttonBotRight?.addCb(ButtonPressType.long, (pValue: boolean) => {
            pValue && sonosGroup.trigger(this.getRoom().settings.radioUrl);
          });
        }
      }

      if (SettingsService.settings.daikin?.buttonBotRightForAc === true) {
        const heatGroup: HeatGroup | undefined = this.getRoom().HeatGroup;
        if (heatGroup !== undefined && heatGroup.getOwnAcDevices().length > 0) {
          t.buttonBotRight?.addCb(ButtonPressType.short, (pValue: boolean) => {
            pValue && heatGroup.setAc(true);
          });
          t.buttonBotRight?.addCb(ButtonPressType.long, (pValue: boolean) => {
            pValue && heatGroup.setAc(false, true);
          });
        }
      }
    });
  }
}
