import { iBluetoothTrackingSettings } from '../../config';
import { iBaseDevice } from '../baseDeviceInterfaces';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { DeviceType } from '../deviceType';
import { LogLevel } from '../../../models';
import { API, LogDebugType, ServerLogService, SettingsService, Utils } from '../../services';
import { Devices } from '../devices';
import { TrackedDistanceData } from './trackedDistanceData';
import { iBluetoothDetector } from '../baseDeviceInterfaces/iBluetoothDetector';

export class DetectedBluetoothDevice implements iBaseDevice {
  public distanceMap: Map<string, TrackedDistanceData> = new Map<string, TrackedDistanceData>();
  public readonly deviceCapabilities: DeviceCapability[] = [DeviceCapability.trackableDevice];
  public deviceType: DeviceType = DeviceType.TrackableDevice;
  public info: DeviceInfo = new DeviceInfo();

  constructor(public id: string, settings?: iBluetoothTrackingSettings) {
    if (settings === undefined) {
      return;
    }
    this.info.customName = settings.customName;
    this.info.allDevicesKey = DetectedBluetoothDevice.deviceKeyBySettings(settings);
    if (settings.activeTracking) {
      Devices.alLDevices[this.info.allDevicesKey] = this;
    }
  }

  public get name(): string {
    return this.info.customName ?? `Unknown ${this.id}`;
  }

  public updateDistance(tracker: iBluetoothDetector, distance: number) {
    const trackedDistance = this.distanceMap.get(tracker.id) ?? new TrackedDistanceData(tracker);
    trackedDistance.update(distance);
    this.distanceMap.set(tracker.id, trackedDistance);
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: '',
      deviceId: this.info.allDevicesKey,
      deviceName: this.name,
    });
  }

  public toJSON(): Partial<iBaseDevice> {
    return Utils.jsonFilter(this);
  }

  public getDistance(id: string, maxAge: number = 120): TrackedDistanceData | undefined {
    const data = this.distanceMap.get(id);
    if (data === undefined) {
      return undefined;
    }
    return data.isOutdated(maxAge) ? undefined : data;
  }

  public getDistances(maxAge: number = 120): Array<TrackedDistanceData> {
    const result: Array<TrackedDistanceData> = [];
    for (const data of this.distanceMap.values()) {
      if (data.isOutdated(maxAge)) {
        continue;
      }
      result.push(data);
    }
    return result;
  }

  public getDistanceReport(maxAge: number = 120): string {
    const dataPoints = this.getDistances(maxAge);
    const result = [`Distances for ${this.info.customName}`];
    for (const data of dataPoints) {
      result.push(
        `${data.trackerName}: ${Utils.round(data.distance ?? -99, 2)}m updated ${new Date(
          data.lastUpdate,
        ).toLocaleTimeString()}`,
      );
      Utils.nowTime();
    }
    return result.join('\n');
  }

  public static getOrCreate(devName: string): DetectedBluetoothDevice {
    const settings = SettingsService.settings.espresense?.deviceMap[devName];
    if (settings === undefined) {
      return new DetectedBluetoothDevice(devName);
    }
    const dev = API.getDevice(this.deviceKeyBySettings(settings));
    return (dev as DetectedBluetoothDevice | undefined) ?? new DetectedBluetoothDevice(devName, settings);
  }

  private static deviceKeyBySettings(settings: iBluetoothTrackingSettings): string {
    return `trackedDevice-${settings.customName}`;
  }
}