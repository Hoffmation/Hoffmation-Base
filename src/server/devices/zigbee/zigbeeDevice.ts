import { DeviceType } from '../deviceType';
import { LogLevel } from '../../../models/logLevel';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { ServerLogService } from '../../services/log-service';
import { DeviceInfo } from '../DeviceInfo';

export class ZigbeeDevice extends IoBrokerBaseDevice {
  public available: boolean = false;
  public linkQuality: number = 0;
  public voltage: string = '';

  public constructor(pInfo: DeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Zigbee: ${initial ? 'Initiales ' : ''}Update für "${this.info.customName}": ID: ${idSplit.join(
        '.',
      )} JSON: ${JSON.stringify(state)}`,
    );
    if (!pOverride) {
      ServerLogService.writeLog(
        LogLevel.Warn,
        `Keine Update Überschreibung für "${this.info.customName}":\n\tID: ${idSplit.join(
          '.',
        )}\n\tData: ${JSON.stringify(state)}`,
      );
    }

    switch (idSplit[3]) {
      case 'available':
        this.available = state.val as boolean;
        if (!this.available) {
          ServerLogService.writeLog(
            LogLevel.Debug,
            `Das Zigbee Gerät mit dem Namen "${this.info.customName}" ist nicht erreichbar.`,
          );
        }
        break;
      case 'battery':
        this.battery = state.val as number;
        if (this.battery < 20) {
          ServerLogService.writeLog(
            LogLevel.Alert,
            `Das Zigbee Gerät mit dem Namen "${this.info.customName}" hat unter 20% Batterie.`,
          );
        }
        break;

      case 'link_quality':
        this.linkQuality = state.val as number;
        if (this.linkQuality < 5) {
          ServerLogService.writeLog(
            LogLevel.Debug,
            `Das Zigbee Gerät mit dem Namen "${this.info.customName}" hat eine schlechte Verbindung (${this.linkQuality}).`,
          );
        }
        break;

      case 'voltage':
        this.voltage = state.val as string;
        break;
    }
  }
}
