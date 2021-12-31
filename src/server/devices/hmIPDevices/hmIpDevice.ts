import { LogLevel } from '../../../models/logLevel';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';

export class HmIPDevice extends IoBrokerBaseDevice {
  public lowBattery: boolean = false;

  public constructor(pInfo: DeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    if (!pOverride) {
      this.log(
        LogLevel.Trace,
        `Keine Update Überschreibung :\n\tID: ${idSplit.join('.')}\n\tData: ${JSON.stringify(state)}`,
      );
    }

    this.log(
      LogLevel.DeepTrace,
      `Base-Device Update for ${this.info.customName}("${idSplit.join('.')}", ${state}, ${initial}, ${pOverride})`,
    );

    if (idSplit[3] !== '0') {
      // Dies ist etwas Gerätespezifisches
      return;
    }

    switch (idSplit[4]) {
      case 'OPERATING_VOLTAGE':
        this.battery = state.val as number;
        break;
      case 'LOW_BAT':
        const newBatLowVal: boolean = state.val as boolean;
        if (newBatLowVal) {
          this.log(LogLevel.Alert, `!!BATTERIE FAST LEER!!`);
        }
        break;
    }
  }
}
