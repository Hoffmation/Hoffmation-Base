import { deviceConfig } from '../../models/deviceConfig';
import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { HmIPDevice } from './hmIPDevices/hmIpDevice';
import { ZigbeeDevice } from './zigbee/zigbeeDevice';
import { DeviceType } from './deviceType';
import { HmIpPraezenz } from './hmIPDevices/hmIpPraezenz';
import { ServerLogService } from '../services/log-service/log-service';
import { iRoomImportEnforcer } from '../../models/rooms/iRoomImportEnforcer';
import { DeviceInfo } from './DeviceInfo';
import { LogLevel } from '../../models/logLevel';
import { HmIpBewegung } from './hmIPDevices/hmIpBewegung';
import { ZigbeeAquaraVibra } from './zigbee/zigbeeAquaraVibra';
import { ZigbeeAquaraMotion } from './zigbee/zigbeeAquaraMotion';
import { ZigbeeIkeaSteckdose } from './zigbee/zigbeeIkeaSteckdose';
import { ZigbeeIlluLedRGBCCT } from './zigbee/zigbeeIlluLedRGBCCT';
import { ZigbeeIlluDimmer } from './zigbee/zigbeeIlluDimmer';
import { ZigbeeHeimanSmoke } from './zigbee/zigbeeHeimanSmoke';
import { ZigbeeAquaraWater } from './zigbee/zigbeeAquaraWater';
import { ZigbeeBlitzShp } from './zigbee/zigbeeBlitzShp';
import { ZigbeeIlluLampe } from './zigbee/zigbeeIlluLampe';
import { ZigbeeIlluActuator } from './zigbee/zigbeeIlluActuator';
import { HmIpLampe } from './hmIPDevices/hmIpLampe';
import { HmIpRoll } from './hmIPDevices/hmIpRoll';
import { HmIpTaster } from './hmIPDevices/hmIpTaster';
import { HmIpWippe } from './hmIPDevices/hmIpWippe';
import { HmIpGriff } from './hmIPDevices/hmIpGriff';
import { HmIpTherm } from './hmIPDevices/hmIpTherm';
import { HmIpHeizung } from './hmIPDevices/hmIpHeizung';
import { HmIpTuer } from './hmIPDevices/hmIpTuer';
import { HmIpHeizgruppe } from './hmIPDevices/hmIpHeizgruppe';
import { ZigbeeIlluShutter } from './zigbee/zigbeeIlluShutter';
import { ZigbeeSMaBiTMagnetContact } from './zigbee/zigbeeSMaBiTMagnetContact';
import { ZigbeeSonoffMotion } from './zigbee/zigbeeSonoffMotion';
import { ZigbeeMotionSensor } from './zigbee/zigbeeMotionSensor';
import { HmIpAccessPoint } from './hmIPDevices/hmIpAccessPoint';
import { ZigbeeAqaraMagnetContact } from './zigbee/zigbeeAqaraMagnetContact';
import { ZigbeeSonoffTemp } from './zigbee/zigbeeSonoffTemp';

export class Devices {
  public static IDENTIFIER_HOMEMATIC: string = 'hm-rpc';
  public static IDENTIFIER_ZIGBEE: string = 'zigbee';
  public static alLDevices: { [id: string]: IoBrokerBaseDevice } = {};

  public constructor(pDeviceData: { [id: string]: deviceConfig }, pRoomImportEnforcer?: iRoomImportEnforcer) {
    // This forces import of rooms at correct timing, to allow devices to land in proper rooms.
    pRoomImportEnforcer?.addRoomConstructor();

    ServerLogService.writeLog(LogLevel.Info, `Constructing devices now`);
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

  public static midnightReset(): void {
    // Nothing yet
  }

  public static resetPraesenzCount(): void {
    ServerLogService.writeLog(LogLevel.Info, `3 Uhr Reset der Präsenzmelder`);
    for (const dID in Devices.alLDevices) {
      const d = Devices.alLDevices[dID];
      if (d.deviceType === DeviceType.HmIpPraezenz) {
        ServerLogService.writeLog(LogLevel.Debug, `2 Uhr Reset der Tages Detektionen von ${d.info.customName}`);
        (d as HmIpPraezenz).detectionsToday = 0;
      } else if (d.deviceType === DeviceType.HmIpBewegung) {
        ServerLogService.writeLog(LogLevel.Debug, `2 Uhr Reset der Tages Detektionen von ${d.info.customName}`);
        (d as HmIpBewegung).detectionsToday = 0;
      } else if (d.deviceType === DeviceType.ZigbeeSonoffMotion || d.deviceType === DeviceType.ZigbeeAquaraMotion) {
        ServerLogService.writeLog(LogLevel.Debug, `2 Uhr Reset der Tages Detektionen von ${d.info.customName}`);
        (d as ZigbeeMotionSensor).detectionsToday = 0;
      }
    }
  }

  private processZigbeeDevice(cDevConf: deviceConfig) {
    const zigbeeInfo: DeviceInfo = new DeviceInfo(cDevConf);
    const fullName: string = `${Devices.IDENTIFIER_ZIGBEE}-${zigbeeInfo.devID}`;
    zigbeeInfo.allDevicesKey = fullName;

    if (typeof Devices.alLDevices[fullName] !== 'undefined') {
      return;
    }

    ServerLogService.writeLog(
      LogLevel.Trace,
      `${zigbeeInfo.devID} with Type "${zigbeeInfo.deviceType}" doesn't exists --> create it`,
    );
    let d: ZigbeeDevice;
    switch (zigbeeInfo.deviceType) {
      case 'AqaraMagnetContact':
        d = new ZigbeeAqaraMagnetContact(zigbeeInfo);
        break;
      case 'AquaraMotion':
        d = new ZigbeeAquaraMotion(zigbeeInfo);
        break;
      case 'AquaraVibra':
        d = new ZigbeeAquaraVibra(zigbeeInfo);
        break;
      case 'AquaraWater':
        d = new ZigbeeAquaraWater(zigbeeInfo);
        break;
      case 'BlitzShp':
        d = new ZigbeeBlitzShp(zigbeeInfo);
        break;
      case 'HeimanSmoke':
        d = new ZigbeeHeimanSmoke(zigbeeInfo);
        break;
      case 'IkeaStecker':
        d = new ZigbeeIkeaSteckdose(zigbeeInfo);
        break;
      case 'IlluActuator':
        d = new ZigbeeIlluActuator(zigbeeInfo);
        break;
      case 'IlluDimmer':
        d = new ZigbeeIlluDimmer(zigbeeInfo);
        break;
      case 'IlluLampe':
        d = new ZigbeeIlluLampe(zigbeeInfo);
        break;
      case 'IlluShutter':
        d = new ZigbeeIlluShutter(zigbeeInfo);
        break;
      case 'LedRGBCCT':
        d = new ZigbeeIlluLedRGBCCT(zigbeeInfo);
        break;
      case 'SMaBiTMagnet':
        d = new ZigbeeSMaBiTMagnetContact(zigbeeInfo);
        break;
      case 'SonoffMotion':
        d = new ZigbeeSonoffMotion(zigbeeInfo);
        break;
      case 'SonoffTemp':
        d = new ZigbeeSonoffTemp(zigbeeInfo);
        break;
      default:
        ServerLogService.writeLog(LogLevel.Warn, `No zigbee Device Type for ${zigbeeInfo.deviceType} defined`);
        d = new ZigbeeDevice(zigbeeInfo, DeviceType.unknown);
    }
    Devices.alLDevices[fullName] = d;
  }

  private processHMIPDevice(cDevConf: deviceConfig) {
    const hmIPInfo: DeviceInfo = new DeviceInfo(cDevConf);
    const fullName: string = `${Devices.IDENTIFIER_HOMEMATIC}-${hmIPInfo.devID}`;
    hmIPInfo.allDevicesKey = fullName;

    if (typeof Devices.alLDevices[fullName] !== 'undefined') {
      return;
    }
    ServerLogService.writeLog(
      LogLevel.Trace,
      `${hmIPInfo.devID} with Type "${hmIPInfo.deviceType}" doesn't exists --> create it`,
    );

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
      case 'AccessPoint':
        d = new HmIpAccessPoint(hmIPInfo);
        break;
      default:
        ServerLogService.writeLog(LogLevel.Warn, `No HmIP Device Type for ${hmIPInfo.deviceType} defined`);
        d = new HmIPDevice(hmIPInfo, DeviceType.unknown);
    }
    Devices.alLDevices[fullName] = d;
  }

  public static getBatteryInfo(): string {
    ServerLogService.writeLog(LogLevel.Info, `Getting Battery Info`);
    let data: Array<{ name: string; amount: number }> = [];
    const result: string[] = [
      `These are the battery values for each device. Device dependandt some are in volts, some in %`,
    ];
    for (const key in this.alLDevices) {
      const d: IoBrokerBaseDevice = this.alLDevices[key];
      if (d.battery !== undefined) {
        data.push({ name: d.info.customName, amount: d.battery });
      }
    }
    data = data.sort((a: { name: string; amount: number }, b: { name: string; amount: number }) => {
      return a.amount - b.amount;
    });
    for (let i = 0; i < data.length; i++) {
      result.push(`${data[i].amount}\t${data[i].name}`);
    }
    return result.join('\n');
  }
}
