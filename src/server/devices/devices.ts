import { deviceConfig, iRoomImportEnforcer, LogLevel } from '../../models';
import {
  HmIpAccessPoint,
  HmIpBewegung,
  HmIPDevice,
  HmIpGriff,
  HmIpHeizgruppe,
  HmIpHeizung,
  HmIpLampe,
  HmIpPraezenz,
  HmIpRoll,
  HmIpTaster,
  HmIpTherm,
  HmIpTuer,
  HmIpWippe,
} from './hmIPDevices';
import {
  ZigbeeAqaraMagnetContact,
  ZigbeeAqaraOpple3Switch,
  ZigbeeAquaraMotion,
  ZigbeeAquaraVibra,
  ZigbeeAquaraWater,
  ZigbeeBlitzShp,
  ZigbeeDevice,
  ZigbeeEuroHeater,
  ZigbeeHeimanSmoke,
  ZigbeeIkeaSteckdose,
  ZigbeeIlluActuator,
  ZigbeeIlluDimmer,
  ZigbeeIlluLampe,
  ZigbeeIlluLedRGBCCT,
  ZigbeeIlluShutter,
  ZigbeeSMaBiTMagnetContact,
  ZigbeeSonoffMotion,
  ZigbeeSonoffTemp,
  ZigbeeTuyaValve,
  ZigbeeUbisysShutter,
} from './zigbee';
import { DeviceType } from './deviceType';
import { ServerLogService } from '../services';
import { IoBrokerDeviceInfo } from './IoBrokerDeviceInfo';
import { iBaseDevice, iBatteryDevice, iEnergyManager, iMotionSensor } from './baseDeviceInterfaces';
import { JsObjectEnergyManager } from './jsObject';
import { WledDevice } from './wledDevice';
import { DeviceCapability } from './DeviceCapability';

export class Devices {
  public static IDENTIFIER_HOMEMATIC: string = 'hm-rpc';
  public static IDENTIFIER_JS: string = 'javascript';
  public static IDENTIFIER_ZIGBEE: string = 'zigbee';
  public static IDENTIFIER_WLED: string = 'wled';
  public static alLDevices: { [id: string]: iBaseDevice } = {};
  public static energymanager?: iEnergyManager = undefined;

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
        Devices.processHMIPDevice(cDevConf);
      } else if (cName.indexOf('00-Zigbee') === 0) {
        Devices.processZigbeeDevice(cDevConf);
      } else if (cName.indexOf('00-WLED') === 0) {
        Devices.processWledDevice(cDevConf);
      } else if (cName.indexOf('00-EnergyManager') === 0 && cDevConf.type !== 'folder') {
        ServerLogService.writeLog(LogLevel.Info, `Found Energy-Manager in Device json.`);
        Devices.createEnergyManager(cDevConf);
      }
    }

    HmIPDevice.checkMissing();
    ZigbeeDevice.checkMissing();
  }

  public static midnightReset(): void {
    // Nothing yet
  }

  public static resetDetectionsToday(): void {
    ServerLogService.writeLog(LogLevel.Info, `3 o'clock reset of motion sensors`);
    for (const dID in Devices.alLDevices) {
      const d = Devices.alLDevices[dID];
      if (d.deviceCapabilities.includes(DeviceCapability.motionSensor)) {
        d.log(LogLevel.Debug, `3 o'clock reset of detections`);
        (d as iMotionSensor).detectionsToday = 0;
      }
    }
  }

  public static getBatteryInfo(): string {
    ServerLogService.writeLog(LogLevel.Info, `Getting Battery Info`);
    let data: Array<{ name: string; amount: number }> = [];
    const result: string[] = [
      `These are the battery values for each device. Device dependandt some are in volts, some in %`,
    ];
    for (const key in this.alLDevices) {
      const d: iBatteryDevice = this.alLDevices[key] as iBatteryDevice;
      if (!d.deviceCapabilities.includes(DeviceCapability.batteryDriven)) {
        continue;
      }
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

  private static processZigbeeDevice(cDevConf: deviceConfig) {
    const zigbeeInfo: IoBrokerDeviceInfo = new IoBrokerDeviceInfo(cDevConf);
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
      case 'AqaraOpple3Switch':
        d = new ZigbeeAqaraOpple3Switch(zigbeeInfo);
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
      case 'IlluLedRGBCCT':
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
      case 'UbisysShutter':
        d = new ZigbeeUbisysShutter(zigbeeInfo);
        break;
      case 'TuyaValve':
        d = new ZigbeeTuyaValve(zigbeeInfo);
        break;
      case 'EuroHeater':
        d = new ZigbeeEuroHeater(zigbeeInfo);
        break;
      default:
        ServerLogService.writeLog(LogLevel.Warn, `No zigbee Device Type for ${zigbeeInfo.deviceType} defined`);
        d = new ZigbeeDevice(zigbeeInfo, DeviceType.unknown);
    }
    Devices.alLDevices[fullName] = d;
  }

  private static processWledDevice(cDevConf: deviceConfig) {
    const wledIoBrokerDeviceInfo: IoBrokerDeviceInfo = new IoBrokerDeviceInfo(cDevConf);
    const fullName: string = `${Devices.IDENTIFIER_WLED}-${wledIoBrokerDeviceInfo.devID}`;
    wledIoBrokerDeviceInfo.allDevicesKey = fullName;

    if (typeof Devices.alLDevices[fullName] !== 'undefined') {
      return;
    }

    ServerLogService.writeLog(
      LogLevel.Trace,
      `${wledIoBrokerDeviceInfo.devID} with Type "${wledIoBrokerDeviceInfo.deviceType}" doesn't exists --> create it`,
    );
    Devices.alLDevices[fullName] = new WledDevice(wledIoBrokerDeviceInfo);
  }

  private static processHMIPDevice(cDevConf: deviceConfig) {
    const hmIPInfo: IoBrokerDeviceInfo = new IoBrokerDeviceInfo(cDevConf);
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

  private static createEnergyManager(cDevConf: deviceConfig) {
    const devInfo: IoBrokerDeviceInfo = new IoBrokerDeviceInfo(cDevConf, true);
    const fullName: string = `${Devices.IDENTIFIER_JS}-${devInfo.devID}`;
    devInfo.allDevicesKey = fullName;
    Devices.energymanager = new JsObjectEnergyManager(devInfo);
    Devices.alLDevices[fullName] = Devices.energymanager;
  }
}
