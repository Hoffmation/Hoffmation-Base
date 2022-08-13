import { LogLevel, RoomBase } from '../../../models';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceCapabilities } from '../DeviceCapabilities';

export interface iBaseDevice {
  room: RoomBase | undefined;
  deviceType: DeviceType;
  info: DeviceInfo;
  readonly deviceCapabilities: DeviceCapabilities[];

  readonly id: string;

  log(level: LogLevel, message: string): void;

  toJSON(): Partial<iBaseDevice>;
}
