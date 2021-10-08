import { ZigbeeDeviceType } from '../../../server/devices/zigbee/zigbeeDeviceType';
import { ServerLogService } from '../../../server/services/log-service';
import { LogLevel } from '../../logLevel';

export class ZigbeeAddDeviceItem {
  private _added: boolean = false;

  public get added(): boolean {
    return this._added;
  }

  public set added(value: boolean) {
    if (this._added) {
      ServerLogService.writeLog(LogLevel.Error, `${this.customName} Added twice`);
    }
    this._added = value;
  }
  constructor(public setID: (value: string) => void, public index: number, public customName: string) {}
}

export class ZigbeeRoomSettings {
  public devices: Array<Array<ZigbeeAddDeviceItem>> = [];
  constructor(public RoomName: string) {}

  public addDevice(
    deviceType: ZigbeeDeviceType,
    setID: (value: string) => void,
    index: number,
    customName: string | undefined = undefined,
  ): void {
    if (this.devices[deviceType] === undefined) {
      this.devices[deviceType] = [];
    }
    if (customName === undefined) {
      customName = `${this.RoomName} ${ZigbeeDeviceType[deviceType]}`;
    }
    this.devices[deviceType][index] = new ZigbeeAddDeviceItem(setID, index, customName);
  }

  public checkMissing(): void {
    for (const type in this.devices) {
      const devs = this.devices[type];
      for (const index in devs) {
        const dev = devs[index];
        if (!dev.added) {
          ServerLogService.writeLog(LogLevel.Error, `${dev.customName} fehlt in der Device JSON`);
        }
      }
    }
  }
}
