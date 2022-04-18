import { LogLevel, RoomBase } from '../../models';
import { DeviceType } from './deviceType';
import { DeviceInfo } from './DeviceInfo';

export interface IBaseDevice {
  room: RoomBase | undefined;
  deviceType: DeviceType;
  info: DeviceInfo;

  readonly id: string;

  battery: number | undefined;

  log(level: LogLevel, message: string): void;
}
