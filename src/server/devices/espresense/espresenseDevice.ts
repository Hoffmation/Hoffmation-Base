import { iBaseDevice } from '../baseDeviceInterfaces';
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

export class EspresenseDevice implements iBaseDevice, iBluetoothDetector {
  public readonly deviceCapabilities: DeviceCapability[] = [DeviceCapability.bluetoothDetector];
  public deviceType: DeviceType = DeviceType.Espresense;
  public readonly name: string;
  private deviceMap: Map<string, DetectedBluetoothDevice> = new Map<string, DetectedBluetoothDevice>();
  private proximityCallback: Map<string, ProximityCallback[]> = new Map<string, ProximityCallback[]>();

  public constructor(name: string, roomName: string) {
    this.name = name;
    this._info = new DeviceInfo();
    this._info.fullName = `Espresense ${roomName} ${name}`;
    this._info.customName = `Espresense ${name}`;
    this._info.room = roomName;
    this._info.allDevicesKey = `espresense-${roomName}-${name}`;
    Devices.alLDevices[this._info.allDevicesKey] = this;
    EspresenseCoordinator.addDevice(this, name);
  }

  protected _info: DeviceInfo;

  public get info(): DeviceInfo {
    return this._info;
  }

  public set info(info: DeviceInfo) {
    this._info = info;
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `espresense-${this.info.room}-${this.info.customName}`;
  }

  public get room(): RoomBase | undefined {
    return API.getRoom(this.info.room);
  }

  public distanceOfDevice(deviceName: string): number | undefined {
    for (const dev of this.deviceMap.values()) {
      if (dev.name == deviceName) {
        return dev.distance;
      }
    }
    return undefined;
  }

  public isDevicePresent(deviceName: string, maxDistance: number): boolean {
    return (this.distanceOfDevice(deviceName) ?? 99) < maxDistance;
  }

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
      dev = this.addDeviceTracking(devName, 'Unknown');
    }
    dev.lastUpdate = Utils.nowMS();
    dev.previousDistance = dev.distance;
    dev.distance = data.distance;
    this.checkCbs(dev);
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: this.room?.roomName ?? '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  public toJSON(): Partial<iBaseDevice> {
    return Utils.jsonFilter(this);
  }

  public addProximityCallback(cb: ProximityCallback): void {
    let currentValue: ProximityCallback[] | undefined = this.proximityCallback.get(cb.deviceName);
    if (currentValue == undefined) {
      currentValue = [];
    }
    currentValue.push(cb);
    this.proximityCallback.set(cb.deviceName, currentValue);
  }

  private addDeviceTracking(devName: string, translatedName: string = 'Unknown'): DetectedBluetoothDevice {
    const dev = new DetectedBluetoothDevice(devName, translatedName);
    this.deviceMap.set(devName, dev);
    return dev;
  }

  private checkCbs(dev: DetectedBluetoothDevice): void {
    const cbs = this.proximityCallback.get(dev.name);
    if (cbs === undefined) {
      return;
    }

    const distance: number | undefined = dev.distance;
    const hasPreviousDstance: boolean = dev.previousDistance !== undefined;
    for (const cb of cbs) {
      if (distance === undefined) {
        if (hasPreviousDstance) {
          cb.callback(false, undefined);
        }
        continue;
      }
      if (distance > cb.distanceTrigger && (dev.previousDistance ?? 99) < cb.distanceTrigger) {
        cb.callback(false, distance);
      } else if (distance < cb.distanceTrigger && (dev.previousDistance ?? 0) > cb.distanceTrigger) {
        cb.callback(true, distance);
      }
    }
  }
}
