import { OwnSonosDevice, Utils } from '../../services';
import { BaseGroup } from './base-group';
import { DeviceClusterType } from '../device-cluster-type';
import { GroupType } from './group-type';
import { DeviceList } from '../device-list';

export class SonosGroup extends BaseGroup {
  private _playing: boolean = false;

  public constructor(roomName: string, speakerIds: string[]) {
    super(roomName, GroupType.Speaker);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Speaker, new DeviceList(speakerIds, true));
  }

  public getOwnSonosDevices(): OwnSonosDevice[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Speaker) as OwnSonosDevice[];
  }

  public playRadio(radioUrl: string): void {
    this.getOwnSonosDevices().forEach((s) => {
      Utils.guardedTimeout(() => {
        s.device?.SetAVTransportURI(radioUrl);
      }, 1500);
    });
    this._playing = true;
  }

  public turnOff(): void {
    this.getOwnSonosDevices().forEach((s) => {
      s.device?.Stop();
    });
    this._playing = false;
  }

  public trigger(track: string): void {
    if (this._playing) {
      this.turnOff();
      return;
    }

    this.playRadio(track);
  }
}
