import { DeviceClusterType } from './device-cluster-type';
import { DeviceList } from './device-list';
import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { Utils } from '../services';
import { DeviceType } from './deviceType';
import { iBaseDevice } from './baseDeviceInterfaces';

export class DeviceCluster {
  public constructor(public deviceMap: Map<DeviceClusterType, DeviceList> = new Map<DeviceClusterType, DeviceList>()) {}

  public getIoBrokerDevicesByType(type: DeviceClusterType): IoBrokerBaseDevice[] {
    if (type === DeviceClusterType.Speaker) {
      throw new Error(`This is no IoBroker Device`);
    }
    return this.getDevicesByType(type) as Array<IoBrokerBaseDevice>;
  }

  public getDevicesByType(type: DeviceClusterType): Array<iBaseDevice> {
    return this.deviceMap.get(type)?.getDevices() ?? [];
  }

  public addByDeviceType(device: iBaseDevice): void {
    const type: DeviceType = device.deviceType;
    const clusterTypes: DeviceClusterType[] = [DeviceClusterType.all];
    switch (type) {
      case DeviceType.Daikin:
        clusterTypes.push(DeviceClusterType.Ac);
        break;
      case DeviceType.Sonos:
        clusterTypes.push(DeviceClusterType.Speaker);
        break;
      case DeviceType.SamsungTv:
        clusterTypes.push(DeviceClusterType.Tv);
        break;
      case DeviceType.HmIpLampe:
      case DeviceType.ZigbeeIlluDimmer:
      case DeviceType.ZigbeeIlluLampe:
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
        clusterTypes.push(DeviceClusterType.Shutter);
        break;
      case DeviceType.ZigbeeSonoffTemp:
        clusterTypes.push(DeviceClusterType.TemperaturSensor);
        clusterTypes.push(DeviceClusterType.HumiditySensor);
        break;
      case DeviceType.HmIpGriff:
        clusterTypes.push(DeviceClusterType.Handle);
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
      case DeviceType.ZigbeeSonoffMotion:
      case DeviceType.HmIpPraezenz:
        clusterTypes.push(DeviceClusterType.MotionDetection);
        break;
      case DeviceType.ZigbeeIkeaSteckdose:
        clusterTypes.push(DeviceClusterType.Outlets);
        break;
      case DeviceType.ZigbeeIlluLedRGBCCT:
      case DeviceType.ZigbeeLinkindLedRgbCct:
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
      case DeviceType.ZigbeeBlitzShp:
        clusterTypes.push(DeviceClusterType.Outlets);
        break;
      case DeviceType.WledDevice:
        clusterTypes.push(DeviceClusterType.WLED);
        break;
      case DeviceType.ZigbeeIlluActuator: // Dependent on use case
      case DeviceType.HmIpTherm: // Humidity and temperature not yet implemented
      case DeviceType.HmIpHeizung: // Setting/Controlling via HM-Ip Heizgruppe
      case DeviceType.unknown:
      case DeviceType.HmIpAccessPoint: // You can't really do stuff with it.
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

  public toJSON(): Partial<DeviceCluster & { deviceDict?: { [p: string]: DeviceList } }> {
    return Utils.jsonFilter(this);
  }
}
