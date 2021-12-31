import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { ServerLogService } from '../../services/log-service/log-service';
import { DeviceInfo } from '../DeviceInfo';
import { Taste } from '../taste';
import { LogLevel } from '../../../models/logLevel';

export class HmIpWippe extends HmIPDevice {
  public tasten: {
    Unten: Taste;
    Oben: Taste;
  } = {
    Unten: new Taste(1),
    Oben: new Taste(2),
  };

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpWippe);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(LogLevel.Trace, `Wippe Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);
    let cTaste: Taste | undefined = undefined;
    switch (idSplit[3]) {
      case '1':
        cTaste = this.tasten.Unten;
        break;
      case '2':
        cTaste = this.tasten.Oben;
        break;
    }

    if (cTaste === undefined) {
      return;
    }

    switch (idSplit[4]) {
      case 'PRESS_SHORT':
        if (!initial) {
          // Tasten beim Starten ignorieren
          ServerLogService.writeLog(LogLevel.Debug, `Tasten Update initial für "${this.info.customName}" ignoriert`);
          cTaste.updateShort(state.val as boolean);
        }
        break;
      case 'PRESS_LONG':
        if (!initial) {
          // Tasten beim Starten ignorieren
          ServerLogService.writeLog(LogLevel.Debug, `Tasten Update initial für "${this.info.customName}" ignoriert`);
          cTaste.updateLong(state.val as boolean);
        }
        break;
    }
  }
}
