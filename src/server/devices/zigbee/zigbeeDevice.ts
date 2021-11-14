import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models/logLevel';
import { ServerLogService } from '../../services/log-service';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import {
  ZigbeeAquaraMotion,
  ZigbeeAquaraVibra,
  ZigbeeAquaraWater,
  ZigbeeBlitzShp,
  ZigbeeHeimanSmoke,
  ZigbeeIkeaSteckdose,
  ZigbeeIlluActuator,
  ZigbeeIlluDimmer,
  ZigbeeIlluLampe,
  ZigbeeIlluLedRGBCCT,
} from '../zigbee';

export class ZigbeeDevice extends IoBrokerBaseDevice {
  public available: boolean = false;
  public linkQuality: number = 0;
  public battery: number = -1;
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

  public static createRespectiveDevice(zigbeeInfo: DeviceInfo) {
    let d: ZigbeeDevice;
    switch (zigbeeInfo.deviceType) {
      case 'AquaraVibra':
        d = new ZigbeeAquaraVibra(zigbeeInfo);
        break;
      case 'AquaraMotion':
        d = new ZigbeeAquaraMotion(zigbeeInfo);
        break;
      case 'IkeaStecker':
        d = new ZigbeeIkeaSteckdose(zigbeeInfo);
        break;
      case 'LedRGBCCT':
        d = new ZigbeeIlluLedRGBCCT(zigbeeInfo);
        break;
      case 'IlluDimmer':
        d = new ZigbeeIlluDimmer(zigbeeInfo);
        break;
      case 'HeimanSmoke':
        d = new ZigbeeHeimanSmoke(zigbeeInfo);
        break;
      case 'AquaraWater':
        d = new ZigbeeAquaraWater(zigbeeInfo);
        break;
      case 'BlitzShp':
        d = new ZigbeeBlitzShp(zigbeeInfo);
        break;
      case 'IlluLampe':
        d = new ZigbeeIlluLampe(zigbeeInfo);
        break;
      case 'IlluActuator':
        d = new ZigbeeIlluActuator(zigbeeInfo);
        break;
      default:
        ServerLogService.writeLog(LogLevel.Warn, `No zigbee Device Type for ${zigbeeInfo.deviceType} defined`);
        d = new ZigbeeDevice(zigbeeInfo, DeviceType.unknown);
    }
    return d;
  }
}
