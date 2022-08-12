import { DeviceType } from '../../deviceType';
import { LogLevel } from '../../../../models';
import { IoBrokerBaseDevice } from '../../IoBrokerBaseDevice';
import { DeviceInfo } from '../../DeviceInfo';

export class ZigbeeDevice extends IoBrokerBaseDevice {
  public available: boolean = false;
  public linkQuality: number = 0;
  public voltage: string = '';

  public constructor(pInfo: DeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    this.log(
      LogLevel.DeepTrace,
      `Zigbee: ${initial ? 'Initiales ' : ''}Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    if (!pOverride) {
      this.log(
        LogLevel.Warn,
        `Keine Update Überschreibung:\n\tID: ${idSplit.join('.')}\n\tData: ${JSON.stringify(state)}`,
      );
    }

    switch (idSplit[3]) {
      case 'available':
        this.available = state.val as boolean;
        if (!this.available) {
          this.log(LogLevel.Debug, `Das Zigbee Gerät ist nicht erreichbar.`);
        }
        break;
      case 'battery':
        this.battery = state.val as number;
        if (this.battery < 20) {
          this.log(LogLevel.Alert, `Das Zigbee Gerät hat unter 20% Batterie.`);
        }
        break;

      case 'link_quality':
        this.linkQuality = state.val as number;
        if (this.linkQuality < 5) {
          this.log(LogLevel.Debug, `Das Zigbee Gerät hat eine schlechte Verbindung (${this.linkQuality}).`);
        }
        break;

      case 'voltage':
        this.voltage = (state.val as string | number).toString();
        break;
    }
  }
}
