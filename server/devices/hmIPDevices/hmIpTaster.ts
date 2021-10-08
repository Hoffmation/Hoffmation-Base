import { HmIPDevice } from './hmIpDevice';
import { HmIpDeviceType } from './hmIpDeviceType';
import { DeviceInfo } from '../DeviceInfo';
import { HmIPTaste } from './hmIpTaste';
import { LogLevel } from '/models/logLevel';
import { ServerLogService } from '/server/services/log-service';

export class HmIpTaster extends HmIPDevice {
  public tasten: {
    ObenLinks: HmIPTaste;
    ObenRechts: HmIPTaste;
    MitteLinks: HmIPTaste;
    MitteRechts: HmIPTaste;
    UntenLinks: HmIPTaste;
    UntenRechts: HmIPTaste;
  } = {
    ObenLinks: new HmIPTaste(1),
    ObenRechts: new HmIPTaste(2),
    MitteLinks: new HmIPTaste(3),
    MitteRechts: new HmIPTaste(4),
    UntenLinks: new HmIPTaste(5),
    UntenRechts: new HmIPTaste(6),
  };

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, HmIpDeviceType.HmIpTaster);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(LogLevel.Trace, `Taster Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);
    let cTaste: HmIPTaste | undefined = undefined;
    switch (idSplit[3]) {
      case '1':
        cTaste = this.tasten.ObenLinks;
        break;
      case '2':
        cTaste = this.tasten.ObenRechts;
        break;
      case '3':
        cTaste = this.tasten.MitteLinks;
        break;
      case '4':
        cTaste = this.tasten.MitteRechts;
        break;
      case '5':
        cTaste = this.tasten.UntenLinks;
        break;
      case '6':
        cTaste = this.tasten.UntenRechts;
        break;
    }

    if (cTaste === undefined) {
      return;
    }

    switch (idSplit[4]) {
      case 'PRESS_SHORT':
        if (!initial) {
          // Tasten beim Starten ignorieren
          cTaste.updateShort(state.val as boolean);
        }
        break;
      case 'PRESS_LONG':
        if (!initial) {
          // Tasten beim Starten ignorieren
          cTaste.updateLong(state.val as boolean);
        }
        break;
    }
  }
}
