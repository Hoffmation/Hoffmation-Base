import { LogLevel } from '../../models/logLevel';
import { HmIpDeviceType } from './hmIPDevices/hmIpDeviceType';
import { ZigbeeDeviceType } from './zigbee/zigbeeDeviceType';
import { IOBrokerConnection } from '../ioBroker/connection';
import { ServerLogService } from '../services/log-service';
import { HmIPDevice } from './hmIPDevices/hmIpDevice';
import { ZigbeeDevice } from './zigbee/zigbeeDevice';
import { HmIpGriff } from './hmIPDevices/hmIpGriff';
import { HmIpHeizung } from './hmIPDevices/hmIpHeizung';
import { DeviceInfo } from './DeviceInfo';
import { HmIpLampe } from './hmIPDevices/hmIpLampe';
import { HmIpPraezenz } from './hmIPDevices/hmIpPraezenz';
import { HmIpRoll } from './hmIPDevices/hmIpRoll';
import { HmIpTaster } from './hmIPDevices/hmIpTaster';
import { HmIpTherm } from './hmIPDevices/hmIpTherm';
import { HmIpTuer } from './hmIPDevices/hmIpTuer';
import { HmIpWippe } from './hmIPDevices/hmIpWippe';
import { deviceConfig } from '../../models/deviceConfig';
import { HmIpHeizgruppe } from './hmIPDevices/hmIpHeizgruppe';
import { HmIpBewegung } from './hmIPDevices/hmIpBewegung';
import { ZigbeeIkeaSteckdose } from './zigbee/zigbeeIkeaSteckdose';
import { ZigbeeIlluLedRGBCCT } from './zigbee/zigbeeIlluLedRGBCCT';
import { ZigbeeAquaraVibra } from './zigbee/zigbeeAquaraVibra';
import { ZigbeeIlluDimmer } from './zigbee/zigbeeIlluDimmer';
import { ZigbeeHeimanSmoke } from './zigbee/zigbeeHeimanSmoke';
import { ZigbeeAquaraWater } from './zigbee/zigbeeAquaraWater';
import { ZigbeeBlitzShp } from './zigbee/zigbeeBlitzShp';
import { ZigbeeIlluLampe } from './zigbee/zigbeeIlluLampe';
import { ZigbeeIlluActuator } from './zigbee/zigbeeIlluActuator';
import { iRoomImportEnforcer } from '../../models/rooms/iRoomImportEnforcer';

export class Devices {
  public static hmIP: { [id: string]: HmIPDevice } = {};
  public static Zigbee: { [id: string]: ZigbeeDevice } = {};

  public constructor(pDeviceData: { [id: string]: deviceConfig }, pRoomImportEnforcer: iRoomImportEnforcer) {
    // This forces import of rooms at correct timing, to allow devices to land in proper rooms.
    pRoomImportEnforcer.addRoomConstructor();

    for (const cID in pDeviceData) {
      const cDevConf: deviceConfig = pDeviceData[cID];
      if (
        !cDevConf.common ||
        !cDevConf.common.name ||
        typeof cDevConf.common.name === 'object' ||
        !cDevConf.type ||
        cDevConf.type === 'channel'
      ) {
        continue;
      }

      const cName: string = cDevConf.common.name;

      if (cName.indexOf('00-HmIP') === 0) {
        this.processHMIPDevice(cDevConf);
      } else if (cName.indexOf('00-Zigbee') === 0) {
        this.processZigbeeDevice(cDevConf);
      }
    }

    HmIPDevice.checkMissing();
    ZigbeeDevice.checkMissing();
  }

  public static addIoConnection(pIoConnection: IOBrokerConnection): void {
    for (const id in Devices.hmIP) {
      Devices.hmIP[id].ioConn = pIoConnection;
    }

    for (const id in Devices.Zigbee) {
      Devices.Zigbee[id].ioConn = pIoConnection;
    }
  }

  public static midnightReset(): void {
    // Nothing yet
  }

  public static resetPraesenzCount(): void {
    ServerLogService.writeLog(LogLevel.Info, `3 Uhr Reset der Präsenzmelder`);
    for (const dID in Devices.hmIP) {
      const d = Devices.hmIP[dID];
      if (d.deviceType === HmIpDeviceType.HmIpPraezenz) {
        ServerLogService.writeLog(LogLevel.Debug, `2 Uhr Reset der Tages Detektionen von ${d.info.customName}`);
        (d as HmIpPraezenz).detectionsToday = 0;
      } else if (d.deviceType === HmIpDeviceType.HmIpBewegung) {
        ServerLogService.writeLog(LogLevel.Debug, `2 Uhr Reset der Tages Detektionen von ${d.info.customName}`);
        (d as HmIpBewegung).detectionsToday = 0;
      }
    }
  }

  private processZigbeeDevice(cDevConf: deviceConfig) {
    const zigbeeInfo: DeviceInfo = new DeviceInfo(cDevConf);

    if (typeof Devices.Zigbee[zigbeeInfo.devID] !== 'undefined') {
      return;
    }

    ServerLogService.writeLog(
      LogLevel.Trace,
      `${zigbeeInfo.devID} with Type "${zigbeeInfo.deviceType}" doesn't exists --> create it`,
    );

    switch (zigbeeInfo.deviceType) {
      case 'AquaraVibra':
        Devices.Zigbee[zigbeeInfo.devID] = new ZigbeeAquaraVibra(zigbeeInfo);
        break;
      case 'IkeaStecker':
        Devices.Zigbee[zigbeeInfo.devID] = new ZigbeeIkeaSteckdose(zigbeeInfo);
        break;
      case 'LedRGBCCT':
        Devices.Zigbee[zigbeeInfo.devID] = new ZigbeeIlluLedRGBCCT(zigbeeInfo);
        break;
      case 'IlluDimmer':
        Devices.Zigbee[zigbeeInfo.devID] = new ZigbeeIlluDimmer(zigbeeInfo);
        break;
      case 'HeimanSmoke':
        Devices.Zigbee[zigbeeInfo.devID] = new ZigbeeHeimanSmoke(zigbeeInfo);
        break;
      case 'AquaraWater':
        Devices.Zigbee[zigbeeInfo.devID] = new ZigbeeAquaraWater(zigbeeInfo);
        break;
      case 'BlitzShp':
        Devices.Zigbee[zigbeeInfo.devID] = new ZigbeeBlitzShp(zigbeeInfo);
        break;
      case 'IlluLampe':
        Devices.Zigbee[zigbeeInfo.devID] = new ZigbeeIlluLampe(zigbeeInfo);
        break;
      case 'IlluActuator':
        Devices.Zigbee[zigbeeInfo.devID] = new ZigbeeIlluActuator(zigbeeInfo);
        break;
      default:
        ServerLogService.writeLog(LogLevel.Warn, `No zigbee Device Type for ${zigbeeInfo.deviceType} defined`);
        Devices.Zigbee[zigbeeInfo.devID] = new ZigbeeDevice(zigbeeInfo, ZigbeeDeviceType.unknown);
    }
  }

  private processHMIPDevice(cDevConf: deviceConfig) {
    const hmIPInfo: DeviceInfo = new DeviceInfo(cDevConf);

    if (typeof Devices.hmIP[hmIPInfo.devID] !== 'undefined') {
      return;
    }
    ServerLogService.writeLog(
      LogLevel.Trace,
      `${hmIPInfo.devID} with Type "${hmIPInfo.deviceType}" doesn't exists --> create it`,
    );
    switch (hmIPInfo.deviceType) {
      case 'Lampe':
        Devices.hmIP[hmIPInfo.devID] = new HmIpLampe(hmIPInfo);
        break;
      case 'Roll':
      case 'Broll':
        Devices.hmIP[hmIPInfo.devID] = new HmIpRoll(hmIPInfo);
        break;
      case 'Beweg':
        Devices.hmIP[hmIPInfo.devID] = new HmIpBewegung(hmIPInfo);
        break;
      case 'Taster':
        Devices.hmIP[hmIPInfo.devID] = new HmIpTaster(hmIPInfo);
        break;
      case 'Wippe':
        Devices.hmIP[hmIPInfo.devID] = new HmIpWippe(hmIPInfo);
        break;
      case 'Praezenz':
        Devices.hmIP[hmIPInfo.devID] = new HmIpPraezenz(hmIPInfo);
        break;
      case 'Griff':
        Devices.hmIP[hmIPInfo.devID] = new HmIpGriff(hmIPInfo);
        break;
      case 'Thermostat':
        Devices.hmIP[hmIPInfo.devID] = new HmIpTherm(hmIPInfo);
        break;
      case 'Heizung':
        Devices.hmIP[hmIPInfo.devID] = new HmIpHeizung(hmIPInfo);
        break;
      case 'Tuer':
        Devices.hmIP[hmIPInfo.devID] = new HmIpTuer(hmIPInfo);
        break;
      case 'HeizGr':
        Devices.hmIP[hmIPInfo.devID] = new HmIpHeizgruppe(hmIPInfo);
        break;
      default:
        ServerLogService.writeLog(LogLevel.Warn, `No HmIP Device Type for ${hmIPInfo.deviceType} defined`);
        Devices.hmIP[hmIPInfo.devID] = new HmIPDevice(hmIPInfo, HmIpDeviceType.unknown);
    }
  }
}
