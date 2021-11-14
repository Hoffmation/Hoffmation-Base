import { HmIPDevice } from 'index';
import { DeviceType } from 'index';
import { DeviceInfo } from 'index';
import { Taste } from 'index';
import { LogLevel } from 'index';
import { ServerLogService } from 'index';
import { iTaster } from 'index';

export class HmIpTaster extends HmIPDevice implements iTaster {
  public tasten: { [id: string]: Taste } = {
    ObenLinks: new Taste(1),
    ObenRechts: new Taste(2),
    MitteLinks: new Taste(3),
    MitteRechts: new Taste(4),
    UntenLinks: new Taste(5),
    UntenRechts: new Taste(6),
  };

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpTaster);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(LogLevel.Trace, `Taster Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);
    let cTaste: Taste | undefined = undefined;
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

  public getTastenAssignment(): string {
    const result: string[] = [`Button: ${this.info.customName}`];
    for (const tastenName in this.tasten) {
      const desc: string = this.tasten[tastenName].getDescription();
      if (desc === '') {
        continue;
      }
      result.push(`Button "${tastenName}":`);
      result.push(desc);
      result.push('');
    }
    result.push('____________');
    return result.join('\n');
  }
}
