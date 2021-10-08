import { HmIpDeviceType } from '../../../server/devices/hmIPDevices/hmIpDeviceType';
import { ServerLogService } from '../../../server/services/log-service';
import { LogLevel } from '../../logLevel';

export class HmIpAddDeviceItem {
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

export class HmIpRoomSettings {
  public devices: Array<Array<HmIpAddDeviceItem>> = [];

  constructor(public RoomName: string) {}

  public addDevice(
    deviceType: HmIpDeviceType,
    setID: (value: string) => void,
    index: number,
    customName: string | undefined = undefined,
  ): void {
    if (this.devices[deviceType] === undefined) {
      this.devices[deviceType] = [];
    }
    if (customName === undefined) {
      customName = `${this.RoomName} ${HmIpDeviceType[deviceType]}`;
    }
    this.devices[deviceType][index] = new HmIpAddDeviceItem(setID, index, customName);
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
