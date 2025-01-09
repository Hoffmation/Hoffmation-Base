import { DeviceType } from '../deviceType.js';

export class VeluxDeviceRegistrationInfo {
  public constructor(
    public readonly deviceType: DeviceType,
    public readonly deviceId: string,
    public readonly deviceName: string,
    public readonly room: string,
    public readonly roomIndex: number,
  ) {}
}
