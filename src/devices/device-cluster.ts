import { DeviceClusterType, DeviceType } from '../enums';
import { iBaseDevice, iDeviceCluster, iDeviceList, iIoBrokerBaseDevice } from '../interfaces';
import { Utils } from '../utils';
import { DeviceList } from './device-list';

export class DeviceCluster implements iDeviceCluster {
  public constructor(
    public deviceMap: Map<DeviceClusterType, iDeviceList> = new Map<DeviceClusterType, iDeviceList>(),
  ) {}

  public getIoBrokerDevicesByType(type: DeviceClusterType): iIoBrokerBaseDevice[] {
    if (type === DeviceClusterType.Speaker) {
      throw new Error('This is no IoBroker Device');
    }
    return this.getDevicesByType(type) as Array<iIoBrokerBaseDevice>;
  }

  public getDevicesByType(type: DeviceClusterType): Array<iBaseDevice> {
    return this.deviceMap.get(type)?.getDevices() ?? [];
  }

  public addByDeviceType(device?: iBaseDevice): void {
    if (!device) {
      return;
    }
    const type: DeviceType = device.deviceType;
    const clusterTypes: DeviceClusterType[] = [DeviceClusterType.all];
    switch (type) {
      case DeviceType.Daikin:
        clusterTypes.push(DeviceClusterType.Ac);
        break;
      case DeviceType.Sonos:
        clusterTypes.push(DeviceClusterType.Speaker);
        break;
      case DeviceType.Camera:
        clusterTypes.push(DeviceClusterType.Camera);
        clusterTypes.push(DeviceClusterType.MotionDetection);
        break;
      case DeviceType.HmIpLampe:
      case DeviceType.ZigbeeIlluDimmer:
      case DeviceType.ZigbeeOsramDimmer:
      case DeviceType.ZigbeeIlluLampe:
      case DeviceType.ZigbeeUbisysLampe:
        clusterTypes.push(DeviceClusterType.Lamps);
        break;
      case DeviceType.HmIpWippe:
      case DeviceType.HmIpTaster:
      case DeviceType.ZigbeeIkeaFernbedienung:
        clusterTypes.push(DeviceClusterType.Buttons);
        break;
      case DeviceType.HmIpRoll:
      case DeviceType.ZigbeeIlluShutter:
      case DeviceType.ZigbeeUbisysShutter:
      case DeviceType.VeluxShutter:
        clusterTypes.push(DeviceClusterType.Shutter);
        break;
      case DeviceType.ZigbeeSonoffTemp:
      case DeviceType.SmartGardenSensor:
        clusterTypes.push(DeviceClusterType.TemperaturSensor);
        clusterTypes.push(DeviceClusterType.HumiditySensor);
        break;
      case DeviceType.HmIpGriff:
        clusterTypes.push(DeviceClusterType.Handle);
        break;
      case DeviceType.ZigbeeSodaHandle:
        clusterTypes.push(DeviceClusterType.Handle);
        clusterTypes.push(DeviceClusterType.TemperaturSensor);
        clusterTypes.push(DeviceClusterType.HumiditySensor);
        break;
      case DeviceType.HmIpHeizgruppe:
        clusterTypes.push(DeviceClusterType.Heater);
        clusterTypes.push(DeviceClusterType.TemperaturSensor);
        clusterTypes.push(DeviceClusterType.HumiditySensor);
        break;
      case DeviceType.HmIpTuer:
      case DeviceType.ZigbeeSMaBiTMagnetContact:
      case DeviceType.ZigbeeAqaraMagnetContact:
        clusterTypes.push(DeviceClusterType.MagnetContact);
        break;
      case DeviceType.HmIpBewegung:
      case DeviceType.ZigbeeAquaraMotion:
      case DeviceType.ZigbeeAqaraPresence:
      case DeviceType.ZigbeeSonoffMotion:
      case DeviceType.ZigbeeTuyaMotion:
      case DeviceType.HmIpPraezenz:
        clusterTypes.push(DeviceClusterType.MotionDetection);
        break;
      case DeviceType.ZigbeeIkeaSteckdose:
      case DeviceType.ZigbeeBlitzShp:
        clusterTypes.push(DeviceClusterType.Outlets);
        break;
      case DeviceType.ZigbeeIlluLedRGBCCT:
      case DeviceType.ZigbeeLinkindLedRgbCct:
      case DeviceType.ZigbeeInnr142C:
      case DeviceType.GoveeLed:
        clusterTypes.push(DeviceClusterType.LED);
        break;
      case DeviceType.ZigbeeAquaraVibra:
        clusterTypes.push(DeviceClusterType.Vibration);
        break;
      case DeviceType.ZigbeeHeimanSmoke:
        clusterTypes.push(DeviceClusterType.SmokeDetector);
        break;
      case DeviceType.ZigbeeAquaraWater:
        clusterTypes.push(DeviceClusterType.WaterDetectors);
        break;
      case DeviceType.WledDevice:
        clusterTypes.push(DeviceClusterType.WLED);
        break;
      case DeviceType.ZigbeeIlluActuator: // Dependent on use case
      case DeviceType.ZigbeeUbisysActuator: // Dependent on use case
      case DeviceType.HmIpTherm: // Humidity and temperature not yet implemented
      case DeviceType.HmIpHeizung: // Setting/Controlling via HM-Ip Heizgruppe
      case DeviceType.unknown:
      case DeviceType.HmIpAccessPoint: // You can't really do stuff with it.
      case DeviceType.ShellyActuator: // Dependent on use case
        break;
    }
    for (const type of clusterTypes) {
      this.addToList(type, device);
    }
  }

  public addToList(type: DeviceClusterType, device: iBaseDevice): void {
    const list: string[] | undefined = this.deviceMap.get(type)?.ids;
    if (list !== undefined) {
      if (list.indexOf(device.id) < 0) {
        list.push(device.id);
      }
    } else {
      this.deviceMap.set(type, new DeviceList([device.id]));
    }
  }

  public toJSON(): Partial<
    DeviceCluster & {
      /**
       * Dictionary representation of the normal device map
       */
      deviceDict?: { [p: string]: iDeviceList };
    }
  > {
    return Utils.jsonFilter(this);
  }
}
