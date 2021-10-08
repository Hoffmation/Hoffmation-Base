import { SonosDevice } from '@svrooij/sonos/lib';
import { SonosService } from '../../services/Sonos/sonos-service';
import { SNDevices } from '../../services/Sonos/SonosDevices';
import { Utils } from '../../services/utils/utils';
import { RoomBase } from '../../../models/rooms/RoomBase';

export class SonosGroup {
  private _playing: boolean = false;
  public constructor(private _room: RoomBase, public SNDevices: SNDevices[]) {}

  public playRadio(radioUrl: string): void {
    this.SNDevices.forEach((s) => {
      const d: SonosDevice = SonosService.getDevice(s);
      // d.TerminateQueue();
      Utils.guardedTimeout(() => {
        d.SetAVTransportURI(radioUrl);
      }, 1500);
    });
    this._playing = true;
  }

  public turnOff(): void {
    this.SNDevices.forEach((s) => {
      const d: SonosDevice = SonosService.getDevice(s);
      // d.TerminateQueue();
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
