import { TrilaterationBasePoint } from './trilaterationBasePoint';
import { iTrilaterationBasePoint } from '../../interfaces';
import { iBluetoothDetector } from '../../interfaces/baseDevices/iBluetoothDetector';
import { DeviceCapability, DeviceType, LogLevel } from '../../enums';
import { DetectedBluetoothDevice } from './detectedBluetoothDevice';
import { ProximityCallback } from './proximityCallback';
import { DeviceInfo } from '../DeviceInfo';
import { Devices } from '../devices';
import { EspresenseCoordinator } from './espresenseCoordinator';
import { Trilateration } from './trilateration';
import { RoomBaseDevice } from '../RoomBaseDevice';

export class EspresenseDevice extends RoomBaseDevice implements iBluetoothDetector {
  /** @inheritDoc */
  public readonly position: iTrilaterationBasePoint;
  /** @inheritDoc */
  public settings: undefined = undefined;
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
    const info = new DeviceInfo();
    info.fullName = `Espresense ${roomName} ${name}`;
    info.customName = `Espresense ${name}`;
    info.room = roomName;
    const allDevicesKey = `espresense-${roomName}-${name}`;
    info.allDevicesKey = allDevicesKey;
    super(info, DeviceType.Espresense);
    this.deviceCapabilities.push(DeviceCapability.bluetoothDetector);
    this.position = new TrilaterationBasePoint(x, y, z, roomName);
    this.name = name;
    Devices.alLDevices[allDevicesKey] = this;
    EspresenseCoordinator.addDevice(this, name);
    Trilateration.basePoints.push(this.position);
  }

  /** @inheritDoc */
  public get id(): string {
    return this.info.allDevicesKey ?? `espresense-${this.info.room}-${this.info.customName}`;
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
    } catch (_e) {
      this.log(LogLevel.Error, `Recieved malformed update data: ${state.val}`);
      return;
    }
    const dev = this.deviceMap.get(devName) ?? this.addDeviceTracking(devName);
    if (dev === undefined) {
      return;
    }
    dev.updateDistance(this, data.distance);
    dev.guessRoom();
    const cbs = this.proximityCallbackMap.get(dev.name);
    if (cbs === undefined) {
      return;
    }

    const trackedDistance = dev.getDistance(this.id);
    if (trackedDistance === undefined) {
      this.log(LogLevel.Error, 'TrackedDistance Undefined directly after update');
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

  private addDeviceTracking(devName: string): DetectedBluetoothDevice | undefined {
    const dev = DetectedBluetoothDevice.getOrCreate(devName);
    if (dev) {
      this.deviceMap.set(devName, dev);
    }
    return dev;
  }
}
