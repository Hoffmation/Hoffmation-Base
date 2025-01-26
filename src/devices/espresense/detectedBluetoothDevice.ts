import { DeviceType, LogDebugType, LogLevel } from '../../enums';
import { iBluetoothTrackingSettings } from '../../interfaces';
import { Devices } from '../devices';
import { TrackedDistanceData } from './trackedDistanceData';
import { iBluetoothDetector } from '../../interfaces/baseDevices/iBluetoothDetector';
import { ServerLogService } from '../../logging';
import { Utils } from '../../utils';
import { Persistence } from '../../services';
import { API } from '../../api';
import { TrilaterationPointDistance } from './trilaterationPointDistance';
import { Trilateration } from './trilateration';
import { SettingsService } from '../../settings-service';
import { BaseDevice } from '../BaseDevice';
import { DeviceInfo } from '../DeviceInfo';

export class DetectedBluetoothDevice extends BaseDevice {
  /** @inheritDoc */
  public settings: undefined = undefined;
  /**
   * A Map matching the distances to the trackers identified by {@link iBluetoothDetector.id}
   */
  public distanceMap: Map<string, TrackedDistanceData> = new Map<string, TrackedDistanceData>();
  /**
   * The last room the device was guessed to be in {@link iRoomBase.roomName}
   */
  public lastRoom: string | undefined = undefined;
  /**
   * If the device is currently present
   */
  public present: boolean = false;

  constructor(
    public trackedDeviceId: string,
    settings: iBluetoothTrackingSettings,
  ) {
    const info: DeviceInfo = new DeviceInfo();
    info.customName = settings.customName;
    const allDevicesKey = DetectedBluetoothDevice.deviceKeyBySettings(settings);
    info.allDevicesKey = allDevicesKey;
    super(info, DeviceType.TrackableDevice);
    if (settings.activeTracking) {
      Devices.alLDevices[allDevicesKey] = this;
      this.persistDeviceInfo();
      this.loadDeviceSettings();
    }
  }

  public get customName(): string {
    return this.info.customName;
  }

  public get name(): string {
    return this.info.customName ?? `Unknown ${this.trackedDeviceId}`;
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
        ).toLocaleTimeString('de-DE')}`,
      );
      Utils.nowTime();
    }
    return result.join('\n');
  }

  public static getOrCreate(devName: string): DetectedBluetoothDevice | undefined {
    const settings = SettingsService.settings.espresense?.deviceMap[devName];
    if (settings === undefined) {
      return undefined;
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
        Persistence.dbo?.addDevice(this);
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
