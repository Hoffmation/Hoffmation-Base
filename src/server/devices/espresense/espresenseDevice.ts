import { iRoomDevice } from '../baseDeviceInterfaces';
import { iBluetoothDetector } from '../baseDeviceInterfaces/iBluetoothDetector';
import { DeviceCapability } from '../DeviceCapability';
import { LogLevel, RoomBase } from '../../../models';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceType } from '../deviceType';
import { API, LogDebugType, ServerLogService, Utils } from '../../services';
import { Devices } from '../devices';
import { DetectedBluetoothDevice } from './detectedBluetoothDevice';
import { ProximityCallback } from './proximityCallback';
import { EspresenseCoordinator } from './espresenseCoordinator';
import { TrilaterationBasePoint } from './trilaterationBasePoint';
import { Trilateration } from './trilateration';

export class EspresenseDevice implements iRoomDevice, iBluetoothDetector {
  /** @inheritDoc */
  public readonly position: TrilaterationBasePoint;
  /** @inheritDoc */
  public settings: undefined = undefined;
  /** @inheritDoc */
  public readonly deviceCapabilities: DeviceCapability[] = [DeviceCapability.bluetoothDetector];
  /** @inheritDoc */
  public deviceType: DeviceType = DeviceType.Espresense;
  /**
   * The name of this device
   */
  public readonly name: string;
  private deviceMap: Map<string, DetectedBluetoothDevice> = new Map<string, DetectedBluetoothDevice>();
  private proximityCallbackMap: Map<string, ProximityCallback[]> = new Map<string, ProximityCallback[]>();

  /**
   * Creates a new instance of the EspresenseDevice class
   * @param name - The desired name of the device
   * @param roomName - The name of the room this device is in {@link iRoomBase.roomName}
   * @param x - The x coordinate of the device in the house
   * @param y - The y coordinate of the device in the house
   * @param z - The z coordinate of the device in the house
   */
  public constructor(name: string, roomName: string, x: number, y: number, z: number) {
    this.position = new TrilaterationBasePoint(x, y, z, roomName);
    this.name = name;
    this._info = new DeviceInfo();
    this._info.fullName = `Espresense ${roomName} ${name}`;
    this._info.customName = `Espresense ${name}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `espresense-${roomName}-${name}`;
    Devices.alLDevices[this._info.allDevicesKey] = this;
    EspresenseCoordinator.addDevice(this, name);
    this.persistDeviceInfo();
    this.loadDeviceSettings();
    Trilateration.basePoints.push(this.position);
  }

  /** @inheritDoc */
  public get customName(): string {
    return this.info.customName;
  }

  protected _info: DeviceInfo;

  /** @inheritDoc */
  public get info(): DeviceInfo {
    return this._info;
  }

  /** @inheritDoc */
  public get id(): string {
    return this.info.allDevicesKey ?? `espresense-${this.info.room}-${this.info.customName}`;
  }

  /** @inheritDoc */
  public get room(): RoomBase | undefined {
    return API.getRoom(this.info.room);
  }

  /** @inheritDoc */
  public distanceOfDevice(deviceName: string, maxAge: number = 60): number | undefined {
    for (const dev of this.deviceMap.values()) {
      if (dev.name != deviceName) {
        continue;
      }

      return dev.getDistance(this.id, maxAge)?.distance;
    }
    return undefined;
  }

  /** @inheritDoc */
  public isDevicePresent(deviceName: string, maxDistance: number, maxAge: number = 60): boolean {
    return (this.distanceOfDevice(deviceName, maxAge) ?? 99) < maxDistance;
  }

  /**
   * Updates the device with the given state
   * @param devName - The name of the bluetooth device
   * @param state - The state containing the json-formatted distance data
   */
  public update(devName: string, state: ioBroker.State): void {
    let data = null;
    try {
      data = JSON.parse(state.val as string);
    } catch (e) {
      this.log(LogLevel.Error, `Recieved malformed update data: ${state.val}`);
      return;
    }
    let dev = this.deviceMap.get(devName);
    if (dev === undefined) {
      dev = this.addDeviceTracking(devName);
    }
    dev.updateDistance(this, data.distance);
    dev.guessRoom();
    const cbs = this.proximityCallbackMap.get(dev.name);
    if (cbs === undefined) {
      return;
    }

    const trackedDistance = dev.getDistance(this.id);
    if (trackedDistance === undefined) {
      this.log(LogLevel.Error, "TrackedDistance Undefined directly after update");
      return;
    }
    const distance: number | undefined = trackedDistance.distance;
    const hasPreviousDistance: boolean = trackedDistance.previousDistance !== undefined;
    for (const cb of cbs) {
      if (distance === undefined) {
        if (hasPreviousDistance) {
          cb.callback(false, undefined);
        }
        continue;
      }
      if (distance > cb.distanceTrigger && (trackedDistance.previousDistance ?? 99) < cb.distanceTrigger) {
        cb.callback(false, distance);
      } else if (distance < cb.distanceTrigger && (trackedDistance.previousDistance ?? 0) > cb.distanceTrigger) {
        cb.callback(true, distance);
      }
    }
  }

  /** @inheritDoc */
  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  /** @inheritDoc */
  public toJSON(): Partial<iRoomDevice> {
    return Utils.jsonFilter(this);
  }

  /** @inheritDoc */
  public persistDeviceInfo(): void {
    Utils.guardedTimeout(
      () => {
        Utils.dbo?.addDevice(this);
      },
      5000,
      this,
    );
  }

  /** @inheritDoc */
  public loadDeviceSettings(): void {
    // Nothing
  }

  /** @inheritDoc */
  public addProximityCallback(cb: ProximityCallback): void {
    let currentValue: ProximityCallback[] | undefined = this.proximityCallbackMap.get(cb.deviceName);
    if (currentValue == undefined) {
      currentValue = [];
    }
    currentValue.push(cb);
    this.proximityCallbackMap.set(cb.deviceName, currentValue);
  }

  private addDeviceTracking(devName: string): DetectedBluetoothDevice {
    const dev = DetectedBluetoothDevice.getOrCreate(devName);
    this.deviceMap.set(devName, dev);
    return dev;
  }
}
