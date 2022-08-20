import { LogLevel } from '../../../models';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { DeviceType } from '../deviceType';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class HmIPDevice extends IoBrokerBaseDevice {
  public lowBattery: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    if (!pOverride) {
      this.log(LogLevel.Trace, `Keine Update Überschreibung :\n\tID: ${idSplit.join('.')}`);
      this.log(LogLevel.DeepTrace, `Data: ${JSON.stringify(state)}`);
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
      case 'LOW_BAT':
        const newBatLowVal: boolean = state.val as boolean;
        if (newBatLowVal) {
          this.log(LogLevel.Warn, `!!BATTERIE FAST LEER!!`);
        }
        break;
    }
  }
}
