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
import { Trilateration } from './trilateration';
import { TrilaterationPointDistance } from './trilaterationPointDistance';

export class DetectedBluetoothDevice implements iBaseDevice {
  /** @inheritDoc */
  public settings: undefined = undefined;
  /**
   * A Map matching the distances to the trackers identified by {@link iBluetoothDetector.id}
   */
  public distanceMap: Map<string, TrackedDistanceData> = new Map<string, TrackedDistanceData>();
  /** @inheritDoc */
  public readonly deviceCapabilities: DeviceCapability[] = [DeviceCapability.trackableDevice];
  /** @inheritDoc */
  public deviceType: DeviceType = DeviceType.TrackableDevice;
  /** @inheritDoc */
  public info: DeviceInfo = new DeviceInfo();
  /**
   * The last room the device was guessed to be in {@link iRoomBase.roomName}
   */
  public lastRoom: string | undefined = undefined;
  /**
   * If the device is currently present
   */
  public present: boolean = false;

  constructor(
    public id: string,
    settings?: iBluetoothTrackingSettings,
  ) {
    if (settings === undefined) {
      return;
    }
    this.info.customName = settings.customName;
    this.info.allDevicesKey = DetectedBluetoothDevice.deviceKeyBySettings(settings);
    if (settings.activeTracking) {
      Devices.alLDevices[this.info.allDevicesKey] = this;
      this.persistDeviceInfo();
      this.loadDeviceSettings();
    }
  }

  public get customName(): string {
    return this.info.customName;
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

  public persistDeviceInfo(): void {
    Utils.guardedTimeout(
      () => {
        Utils.dbo?.addDevice(this);
      },
      5000,
      this,
    );
  }

  public loadDeviceSettings(): void {
    // Nothing
  }

  public guessRoom(): void {
    const distances: TrilaterationPointDistance[] = [];
    for (const key of this.distanceMap.keys()) {
      const tracker = API.getDevice(key) as iBluetoothDetector | undefined;
      if (tracker === undefined || tracker.position === undefined) {
        continue;
      }
      const distance = this.getDistance(key, 60);
      if (distance?.distance === undefined) {
        continue;
      }
      distances.push(new TrilaterationPointDistance(tracker.position.ownPoint.coordinateName, distance.distance));
    }
    if (distances.length === 0) {
      this.present = false;
      return; // No distances, no guess
    }
    this.present = true;
    this.log(LogLevel.Debug, `Guessing room from ${distances.length} distance(s).`, LogDebugType.Trilateration);
    this.lastRoom = Trilateration.checkRoom(distances);
  }
}
