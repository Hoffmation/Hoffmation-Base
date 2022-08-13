import { LogLevel, RoomBase } from '../../../models';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceCapability } from '../DeviceCapability';

export interface iBaseDevice {
  room: RoomBase | undefined;
  deviceType: DeviceType;
  info: DeviceInfo;
  readonly deviceCapabilities: DeviceCapability[];

  readonly id: string;

  log(level: LogLevel, message: string): void;

  toJSON(): Partial<iBaseDevice>;
}
