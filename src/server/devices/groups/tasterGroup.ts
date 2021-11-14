import { HmIpTaster } from '../hmIPDevices/hmIpTaster';
import { RoomBase } from '../../../models/rooms/RoomBase';

export class TasterGroup {
  public constructor(private _room: RoomBase, public Taster: HmIpTaster[]) {}

  public initCallbacks(): void {
    this.Taster.forEach((t) => {
      t.tasten.ObenLinks.addLongCallback((pValue) => {
        pValue && this._room.FensterGroup.allRolloDown(false, true);
      }, `Close all Rollos in this room`);

      t.tasten.ObenLinks.addShortCallback((pValue) => {
        pValue && this._room.FensterGroup.allRolloToLevel(25, true);
      }, `Nearly closes all Rollos in this room`);

      t.tasten.ObenRechts.addLongCallback((pValue) => {
        if (!pValue) {
          return;
        }

        this._room.FensterGroup.allRolloUp(true);
      }, `Open all Rollos in this room`);

      t.tasten.ObenRechts.addShortCallback((pValue) => {
        pValue && this._room.FensterGroup.allRolloToLevel(50, true);
      }, `All Rollos in this room to middle`);

      t.tasten.MitteLinks.addLongCallback((pValue) => {
        pValue && this._room.LampenGroup.switchAll(true, true);
      }, `Turn all Lights in this room on`);

      t.tasten.MitteRechts.addLongCallback((pValue) => {
        pValue && this._room.LampenGroup.switchAll(false, true);
      }, `Turn all Lights in this room off`);

      if (this._room.SonosGroup.ownSonosDevices.length > 0) {
        t.tasten.UntenRechts.addLongCallback(() => {
          this._room.SonosGroup.trigger(this._room.Einstellungen.radioUrl);
        });
      }
    });
  }
}
