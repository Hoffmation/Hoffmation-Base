import { iDeviceInfo } from '../interfaces';

export class DeviceInfo implements iDeviceInfo {
  /**
   * The complete name of the device in a human readable format
   */
  public fullName: string = '';
  /**
   * The roomname matching {@link iRoomBase.roomName}
   */
  public room: string = '';
  /**
   * If present the key to access this device in {@link Devices.alLDevices}
   */
  public allDevicesKey?: string;
  private _customName?: string;

  public get customName(): string {
    if (this._customName !== undefined) {
      return this._customName;
    }

    return this.fullName;
  }

  public set customName(val: string) {
    this._customName = val;
  }

  public toJSON(): Partial<DeviceInfo> {
    return this;
  }
}
