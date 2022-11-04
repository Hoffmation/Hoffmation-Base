import { DeviceSettings, LogLevel } from '../../../models';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceCapability } from '../DeviceCapability';

export interface iBaseDevice {
  readonly settings: DeviceSettings | undefined;
  deviceType: DeviceType;
  info: DeviceInfo;
  readonly deviceCapabilities: DeviceCapability[];

  readonly id: string;

  log(level: LogLevel, message: string): void;

  persistDeviceInfo(): void;

  loadDeviceSettings(): void;

  toJSON(): Partial<iBaseDevice>;
}
