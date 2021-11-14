import { LogLevel } from '../../../models/logLevel';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { DeviceType } from '../deviceType';
import { ServerLogService } from '../../services/log-service';
import { DeviceInfo } from '../DeviceInfo';

export class HmIPDevice extends IoBrokerBaseDevice {
  public lowBattery: boolean = false;

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
