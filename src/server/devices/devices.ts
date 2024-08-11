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
  ZigbeeIkeaShutter,
  ZigbeeIkeaSteckdose,
  ZigbeeIlluActuator,
  ZigbeeIlluDimmer,
  ZigbeeIlluLampe,
  ZigbeeIlluLedRGBCCT,
  ZigbeeIlluShutter,
  ZigbeeInnr142C,
  ZigbeeLinkindLedRgbCct,
  ZigbeeOsramDimmer,
  ZigbeeSMaBiTMagnetContact,
  ZigbeeSonoffMotion,
  ZigbeeSonoffTemp,
  ZigbeeTuyaValve,
  ZigbeeUbisysActuator,
  ZigbeeUbisysLampe,
  ZigbeeUbisysShutter,
} from './zigbee';
import { DeviceType } from './deviceType';
import { ServerLogService } from '../services';
import { IoBrokerDeviceInfo } from './IoBrokerDeviceInfo';
import { iBaseDevice, iBatteryDevice, iEnergyManager, iMotionSensor, iTemperatureSensor } from './baseDeviceInterfaces';
import { JsObjectEnergyManager } from './jsObject';
import { WledDevice } from './wledDevice';
import { DeviceCapability } from './DeviceCapability';
import { Dachs } from './dachs';
import { iConfig } from '../config';
import { ShellyActuator, ShellyDevice, ShellyTrv } from './shelly';
import { TuyaDevice, TuyaGarageOpener } from './tuya';
import { NameAmountValuePair } from './nameAmountValuePair';
import { SmartGardenService } from './smartGarden';
import { VeluxService } from './velux';

export class Devices {
  /**
   * A constant for the identifier of HM-IP Adapter devices
   */
  public static readonly IDENTIFIER_HOMEMATIC: string = 'hm-rpc';
  /**
   * A constant for the identifier of JavaScript Adapter devices
   */
  public static readonly IDENTIFIER_JS: string = 'javascript';
  /**
   * A constant for the identifier of Shelly Adapter devices
   */
  public static readonly IDENTIFIER_Shelly: string = 'shelly';
  /**
   * A constant for the identifier of Tuya Adapter devices
   */
  public static readonly IDENTIFIER_TUYA: string = 'tuya';
  /**
   * A constant for the identifier of Zigbee Adapter devices
   */
  public static readonly IDENTIFIER_ZIGBEE: string = 'zigbee';
  /**
   * A constant for the identifier of Zigbee2Mqtt Adapter devices
   */
  public static readonly IDENTIFIER_ZIGBEE2MQTT: string = 'zigbee2mqtt';
  /**
   * A constant for the identifier of WLED Adapter devices
   */
  public static readonly IDENTIFIER_WLED: string = 'wled';
  /**
   * A constant for the identifier of SmartGarden devices.
   */
  public static readonly IDENTIFIER_SMART_GARDEN: string = 'smartgarden';

  /**
   * A constant for the identifier of Velux Adapter devices.
   */
  public static readonly IDENTIFIER_VELUX: string = 'klf200';
  /**
   * A Map containing all devices
   */
  public static alLDevices: { [id: string]: iBaseDevice } = {};
  /**
   * A reference to globally active energy manager
   * @default undefined (no Energy-Manager)
   */
  public static energymanager?: iEnergyManager = undefined;
  /**
   * A reference to the Dachs device
   * @default undefined (no Dachs CHP)
   */
  public static dachs?: Dachs = undefined;
  /**
   * A reference to the temperature sensor measuring the warm water temperature
   * @default undefined (no warm water temperature sensor)
   */
  public static temperatureWarmWater?: iTemperatureSensor = undefined;

  public constructor(
    pDeviceData: { [id: string]: deviceConfig },
    pRoomImportEnforcer?: iRoomImportEnforcer,
    config?: iConfig,
  ) {
    // This forces import of rooms at correct timing, to allow devices to land in proper rooms.
    pRoomImportEnforcer?.addRoomConstructor();

    ServerLogService.writeLog(LogLevel.Info, 'Constructing devices now');
    for (const cID in pDeviceData) {
      const cDevConf: deviceConfig = pDeviceData[cID];
      if (!cDevConf.common || !cDevConf.common.name || typeof cDevConf.common.name === 'object' || !cDevConf.type) {
        continue;
      }

      const cName: string = cDevConf.common.name;

      if (cDevConf.type === 'channel') {
        // Velux has the name in the root channel of a device
        if (cName.indexOf('00-Velux') === 0) {
          Devices.processVeluxDevice(cDevConf);
        }
        continue;
      }

      if (cName.indexOf('00-HmIP') === 0) {
        Devices.processHMIPDevice(cDevConf);
      } else if (cName.indexOf('00-Zigbee') === 0) {
        Devices.processZigbeeDevice(cDevConf);
      } else if (cName.indexOf('00-WLED') === 0) {
        Devices.processWledDevice(cDevConf);
      } else if (cName.indexOf('00-Shelly') === 0) {
        Devices.processShellyDevice(cDevConf);
      } else if (cName.indexOf('00-Tuya') === 0) {
        Devices.processTuyaDevice(cDevConf);
      } else if (cDevConf.type === 'device' && cName.indexOf('DEVICE_') === 0 && cID.indexOf('smartgarden') === 0) {
        Devices.processSmartGardenDevice(cDevConf);
      } else if (
        cName.indexOf('00-EnergyManager') === 0 &&
        cDevConf.type !== 'folder' &&
        !config?.energyManager?.disableJsEnergyManager
      ) {
        ServerLogService.writeLog(LogLevel.Info, 'Found Energy-Manager in Device json.');
        Devices.createEnergyManager(cDevConf);
      }
    }

    HmIPDevice.checkMissing();
    ZigbeeDevice.checkMissing();
    ShellyDevice.checkMissing();
    TuyaDevice.checkMissing();
  }

  public static midnightReset(): void {
    // Nothing yet
  }

  public static resetDetectionsToday(): void {
    ServerLogService.writeLog(LogLevel.Info, "3 o'clock reset of motion sensors");
    for (const dID in Devices.alLDevices) {
      const d = Devices.alLDevices[dID];
      if (d.deviceCapabilities.includes(DeviceCapability.motionSensor)) {
        d.log(LogLevel.Debug, "3 o'clock reset of detections");
        (d as iMotionSensor).detectionsToday = 0;
      }
    }
  }

  public static getBatteryInfo(): string {
    ServerLogService.writeLog(LogLevel.Info, 'Getting Battery Info');
    let data: NameAmountValuePair[] = [];
    const result: string[] = [
      'These are the battery values for each device. Device dependandt some are in volts, some in %',
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
    data = data.sort((a: NameAmountValuePair, b: NameAmountValuePair) => {
      return a.amount - b.amount;
    });
    for (let i = 0; i < data.length; i++) {
      result.push(`${data[i].amount}\t${data[i].name}`);
    }
    return result.join('\n');
  }

  private static processShellyDevice(cDevConf: deviceConfig) {
    const shellyInfo: IoBrokerDeviceInfo = IoBrokerDeviceInfo.byDeviceConfig(cDevConf);
    const fullName: string = `${Devices.IDENTIFIER_Shelly}-${shellyInfo.devID}`;
    shellyInfo.allDevicesKey = fullName;

    if (typeof Devices.alLDevices[fullName] !== 'undefined') {
      return;
    }

    ServerLogService.writeLog(
      LogLevel.Trace,
      `Shelly ${shellyInfo.devID} with Type "${shellyInfo.deviceType}" doesn't exists --> create it`,
    );
    let d: ShellyDevice;
    switch (shellyInfo.deviceType) {
      case 'Trv':
        d = new ShellyTrv(shellyInfo);
        break;
      case 'Actuator':
        d = new ShellyActuator(shellyInfo);
        break;
      default:
        ServerLogService.writeLog(LogLevel.Warn, `No shelly Device Type for ${shellyInfo.deviceType} defined`);
        d = new ShellyDevice(shellyInfo, DeviceType.unknown);
    }
    Devices.alLDevices[fullName] = d;
  }

  private static processTuyaDevice(cDevConf: deviceConfig) {
    const tuyaInfo: IoBrokerDeviceInfo = IoBrokerDeviceInfo.byDeviceConfig(cDevConf);
    const fullName: string = `${Devices.IDENTIFIER_TUYA}-${tuyaInfo.devID}`;
    tuyaInfo.allDevicesKey = fullName;

    if (typeof Devices.alLDevices[fullName] !== 'undefined') {
      return;
    }

    ServerLogService.writeLog(
      LogLevel.Trace,
      `Tuya ${tuyaInfo.devID} with Type "${tuyaInfo.deviceType}" doesn't exists --> create it`,
    );
    let d: TuyaDevice;
    switch (tuyaInfo.deviceType) {
      case 'Opener':
        d = new TuyaGarageOpener(tuyaInfo);
        break;
      default:
        ServerLogService.writeLog(LogLevel.Warn, `No Tuya Device Type for ${tuyaInfo.deviceType} defined`);
        d = new TuyaDevice(tuyaInfo, DeviceType.unknown);
    }
    Devices.alLDevices[fullName] = d;
  }

  private static processZigbeeDevice(cDevConf: deviceConfig) {
    const zigbeeInfo: IoBrokerDeviceInfo = IoBrokerDeviceInfo.byDeviceConfig(cDevConf);
    const apiDevId: string = zigbeeInfo.devID.startsWith('0x') ? zigbeeInfo.devID.substring(2) : zigbeeInfo.devID;
    const fullName: string = `zigbee-${apiDevId}`;
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
      case 'OsramDimmer':
        d = new ZigbeeOsramDimmer(zigbeeInfo);
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
      case 'Innr142C':
        d = new ZigbeeInnr142C(zigbeeInfo);
        break;
      case 'LinkindLedRgbCct':
        d = new ZigbeeLinkindLedRgbCct(zigbeeInfo);
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
      case 'UbisysActuator':
        d = new ZigbeeUbisysActuator(zigbeeInfo);
        break;
      case 'UbisysLampe':
        d = new ZigbeeUbisysLampe(zigbeeInfo);
        break;
      case 'UbisysShutter':
        d = new ZigbeeUbisysShutter(zigbeeInfo);
        break;
      case 'IkeaShutter':
        d = new ZigbeeIkeaShutter(zigbeeInfo);
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

  private static processVeluxDevice(cDevConf: deviceConfig) {
    VeluxService.processVeluxDevice(cDevConf);
  }

  private static processSmartGardenDevice(cDevConf: deviceConfig) {
    SmartGardenService.processSmartGardenDevice(cDevConf);
  }

  private static processWledDevice(cDevConf: deviceConfig) {
    const wledIoBrokerDeviceInfo: IoBrokerDeviceInfo = IoBrokerDeviceInfo.byDeviceConfig(cDevConf);
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
    const hmIPInfo: IoBrokerDeviceInfo = IoBrokerDeviceInfo.byDeviceConfig(cDevConf);
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
    if (Devices.energymanager !== undefined) {
      return;
    }
    const devInfo: IoBrokerDeviceInfo = IoBrokerDeviceInfo.byStateJsSplit(cDevConf);
    const fullName: string = `${Devices.IDENTIFIER_JS}-${devInfo.devID}`;
    devInfo.allDevicesKey = fullName;
    Devices.energymanager = new JsObjectEnergyManager(devInfo);
    Devices.alLDevices[fullName] = Devices.energymanager;
  }
}
