import { DeviceClusterType, GroupType } from '../../enums';
import { BaseGroup } from './base-group';
import { DeviceList } from '../device-list';
import { iSpeaker } from '../../interfaces';
import { Utils } from '../../utils';

export class SpeakerGroup extends BaseGroup {
  private _playing: boolean = false;

  public constructor(roomName: string, speakerIds: string[]) {
    super(roomName, GroupType.Speaker);
    this.deviceCluster.deviceMap.set(DeviceClusterType.Speaker, new DeviceList(speakerIds));
  }

  public getOwnSonosDevices(): iSpeaker[] {
    return this.deviceCluster.getDevicesByType(DeviceClusterType.Speaker) as iSpeaker[];
  }

  public playRadio(radioUrl: string): void {
    this.getOwnSonosDevices().forEach((s) => {
      Utils.guardedTimeout(() => {
        s.playUrl(radioUrl);
      }, 1500);
    });
    this._playing = true;
  }

  public turnOff(): void {
    this.getOwnSonosDevices().forEach((s) => {
      s.stop();
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
