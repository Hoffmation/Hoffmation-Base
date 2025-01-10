import { DeviceClusterType, GroupType } from '../../enums';
import { DeviceList } from '../device-list';
import { iSpeaker, iSpeakerGroup } from '../../interfaces';
import { Utils } from '../../utils';
import { BaseGroup } from './base-group';

export class SpeakerGroup extends BaseGroup implements iSpeakerGroup {
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
