import { HmIpLampe } from './hmIpLampe';
import { HmIpPraezenz } from './hmIpPraezenz';
import { HmIpTuer } from './hmIpTuer';
import { HmIpWippe } from './hmIpWippe';
import { HmIpHeizgruppe } from './hmIpHeizgruppe';
import { HmIpHeizung } from './hmIpHeizung';
import { LogLevel } from '../../../models/logLevel';
import { HmIpBewegung } from './hmIpBewegung';
import { HmIpGriff } from './hmIpGriff';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { DeviceType } from '../deviceType';
import { HmIpTherm } from './hmIpTherm';
import { ServerLogService } from '../../services/log-service';
import { HmIpRoll } from './hmIpRoll';
import { DeviceInfo } from '../DeviceInfo';
import { HmIpTaster } from './hmIpTaster';

export class HmIPDevice extends IoBrokerBaseDevice {
  public lowBattery: boolean = false;

  public static createRespectiveDevice(hmIPInfo: DeviceInfo) {
    let d: HmIPDevice;
    switch (hmIPInfo.deviceType) {
      case 'Lampe':
        d = new HmIpLampe(hmIPInfo);
        break;
      case 'Roll':
      case 'Broll':
        d = new HmIpRoll(hmIPInfo);
        break;
      case 'Beweg':
        d = new HmIpBewegung(hmIPInfo);
        break;
      case 'Taster':
        d = new HmIpTaster(hmIPInfo);
        break;
      case 'Wippe':
        d = new HmIpWippe(hmIPInfo);
        break;
      case 'Praezenz':
        d = new HmIpPraezenz(hmIPInfo);
        break;
      case 'Griff':
        d = new HmIpGriff(hmIPInfo);
        break;
      case 'Thermostat':
        d = new HmIpTherm(hmIPInfo);
        break;
      case 'Heizung':
        d = new HmIpHeizung(hmIPInfo);
        break;
      case 'Tuer':
        d = new HmIpTuer(hmIPInfo);
        break;
      case 'HeizGr':
        d = new HmIpHeizgruppe(hmIPInfo);
        break;
      default:
        ServerLogService.writeLog(LogLevel.Warn, `No HmIP Device Type for ${hmIPInfo.deviceType} defined`);
        d = new HmIPDevice(hmIPInfo, DeviceType.unknown);
    }
    return d;
  }

  public constructor(pInfo: DeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    if (!pOverride) {
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Keine Update Überschreibung für "${this.info.customName}":\n\tID: ${idSplit.join(
          '.',
        )}\n\tData: ${JSON.stringify(state)}`,
      );
    }

    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Base-Device Update for ${this.info.customName}("${idSplit.join('.')}", ${state}, ${initial}, ${pOverride})`,
    );

    if (idSplit[3] !== '0') {
      // Dies ist etwas Gerätespezifisches
      return;
    }

    switch (idSplit[4]) {
      case 'LOW_BAT':
        const newBatLowVal: boolean = state.val as boolean;
        if (newBatLowVal) {
          ServerLogService.writeLog(LogLevel.Alert, `!!BATTERIE FAST LEER!! "${this.info.customName}"`);
        }
        break;
    }
  }
}
