import { DeviceSettings } from '../../../models';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { iIdHolder } from '../../../models/iIdHolder';

export interface iBaseDevice extends iIdHolder {
  readonly settings: DeviceSettings | undefined;
  deviceType: DeviceType;
  info: DeviceInfo;
  readonly deviceCapabilities: DeviceCapability[];

  persistDeviceInfo(): void;

  loadDeviceSettings(): void;

  toJSON(): Partial<iBaseDevice>;
}
