import { OwnSonosDevice } from '../../services/Sonos/sonos-service';
import { Utils } from '../../services/utils/utils';
import { RoomBase } from '../../../models/rooms/RoomBase';

export class SonosGroup {
  private _playing: boolean = false;
  public constructor(private _room: RoomBase, public ownSonosDevices: OwnSonosDevice[]) {}

  public playRadio(radioUrl: string): void {
    this.ownSonosDevices.forEach((s) => {
      Utils.guardedTimeout(() => {
        s.device?.SetAVTransportURI(radioUrl);
      }, 1500);
    });
    this._playing = true;
  }

  public turnOff(): void {
    this.ownSonosDevices.forEach((s) => {
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
