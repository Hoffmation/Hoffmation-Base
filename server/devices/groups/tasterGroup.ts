import { HmIpTaster } from '../hmIPDevices/hmIpTaster';
import { RoomBase } from '../../../models/rooms/RoomBase';

export class TasterGroup {
  public constructor(private _room: RoomBase, public Taster: HmIpTaster[]) {
    for (const t of [...Taster]) {
      t.room = this._room;
    }
  }

  public initCallbacks(): void {
    this.Taster.forEach((t) => {
      t.tasten.ObenLinks.addLongCallback((pValue) => {
        pValue && this._room.FensterGroup.allRolloDown(false, true);
      });

      t.tasten.ObenLinks.addShortCallback((pValue) => {
        pValue && this._room.FensterGroup.allRolloToLevel(25, true);
      });

      t.tasten.ObenRechts.addLongCallback((pValue) => {
        if (!pValue) {
          return;
        }

        this._room.FensterGroup.allRolloUp(true);
      });

      t.tasten.ObenRechts.addShortCallback((pValue) => {
        pValue && this._room.FensterGroup.allRolloToLevel(50, true);
      });

      t.tasten.MitteLinks.addLongCallback((pValue) => {
        pValue && this._room.LampenGroup.switchAll(true, true);
      });

      t.tasten.MitteRechts.addLongCallback((pValue) => {
        pValue && this._room.LampenGroup.switchAll(false, true);
      });

      if (this._room.SonosGroup.SNDevices.length > 0) {
        t.tasten.UntenRechts.addLongCallback(() => {
          this._room.SonosGroup.trigger(this._room.Einstellungen.radioUrl);
        });
      }
    });
  }
}
