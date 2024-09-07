import { BaseGroup } from './base-group';
import { DeviceClusterType } from '../device-cluster-type';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';
import { SpeakerGroup } from './speakerGroup';
import { iButtonSwitch } from '../baseDeviceInterfaces';
import { SettingsService } from '../../services';
import { HeatGroup } from './heatGroup';
import { ButtonPressType } from '../button';
import { ActuatorSetStateCommand, CommandSource, WindowSetDesiredPositionCommand } from '../../../models';

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
          if (!pValue) {
            return;
          }
          this.getRoom().WindowGroup?.setDesiredPosition(
            new WindowSetDesiredPositionCommand(CommandSource.Manual, 0, 'Button Top Left pressed long'),
          );
        },
        'Close all Rollos in this room',
      );

      t.buttonTopLeft?.addCb(
        ButtonPressType.short,
        (pValue) => {
          if (!pValue) {
            return;
          }
          this.getRoom().WindowGroup?.setDesiredPosition(
            new WindowSetDesiredPositionCommand(CommandSource.Manual, 25, 'Button Top Left pressed short'),
          );
        },
        'Nearly closes all Rollos in this room',
      );

      t.buttonTopRight?.addCb(
        ButtonPressType.long,
        (pValue) => {
          if (!pValue) {
            return;
          }
          this.getRoom().WindowGroup?.setDesiredPosition(
            new WindowSetDesiredPositionCommand(CommandSource.Manual, 100, 'Button Top Right pressed long'),
          );
        },
        'Open all Rollos in this room',
      );

      t.buttonTopRight?.addCb(
        ButtonPressType.short,
        (pValue) => {
          if (!pValue) {
            return;
          }
          this.getRoom().WindowGroup?.setDesiredPosition(
            new WindowSetDesiredPositionCommand(CommandSource.Manual, 50, 'Button Top Right pressed short'),
          );
        },
        'All Rollos in this room to middle',
      );

      t.buttonMidLeft?.addCb(
        ButtonPressType.long,
        (pValue) => {
          if (!pValue) {
            return;
          }
          this.getRoom().LightGroup?.switchAll(
            new ActuatorSetStateCommand(CommandSource.Manual, true, 'Button press to turn all lights on'),
          );
        },
        'Turn all Lights in this room on',
      );

      t.buttonMidRight?.addCb(
        ButtonPressType.long,
        (pValue) => {
          if (!pValue) {
            return;
          }
          this.getRoom().LightGroup?.switchAll(
            new ActuatorSetStateCommand(CommandSource.Manual, false, 'Button press to turn all lights off'),
          );
        },
        'Turn all Lights in this room off',
      );

      if (SettingsService.settings.sonos?.buttonBotRightForRadio === true) {
        const sonosGroup: SpeakerGroup | undefined = this.getRoom().SonosGroup;
        if (sonosGroup !== undefined && sonosGroup.getOwnSonosDevices().length > 0) {
          t.buttonBotRight?.addCb(ButtonPressType.long, (pValue: boolean) => {
            if (!pValue) {
              return;
            }
            sonosGroup.trigger(this.getRoom().settings.radioUrl);
          });
        }
      }

      if (SettingsService.settings.daikin?.buttonBotRightForAc === true) {
        const heatGroup: HeatGroup | undefined = this.getRoom().HeatGroup;
        if (heatGroup !== undefined && heatGroup.getOwnAcDevices().length > 0) {
          t.buttonBotRight?.addCb(ButtonPressType.short, (pValue: boolean) => {
            if (!pValue) {
              return;
            }
            heatGroup.setAc(true);
          });
          t.buttonBotRight?.addCb(ButtonPressType.long, (pValue: boolean) => {
            if (!pValue) {
              return;
            }
            heatGroup.setAc(false, true);
          });
        }
      }
    });
  }
}
