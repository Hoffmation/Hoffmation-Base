import { DeviceSettings } from '../../../models';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { iIdHolder } from '../../../models/iIdHolder';

/**
 * This is the main interface for all devices as it ensures certain base functionality.
 * @interface
 */
export interface iBaseDevice extends iIdHolder {
  /**
   * The settings of the device which are overridden by the specific device implementation
   */
  readonly settings: DeviceSettings | undefined;
  /**
   * The hardware-type of the device.
   */
  deviceType: DeviceType;
  /**
   * Some basic information about the device (mainly its name, id, room, etc.)
   */
  info: DeviceInfo;
  /**
   * The capabilities of the device thus referencing other interfaces which then can be used to treat devices regardless of their hardware-type.
   */
  readonly deviceCapabilities: DeviceCapability[];

  /**
   * This method writes the device Info to the configured persistence layer, to ensure having foreign keys for all other persisted data.
   */
  persistDeviceInfo(): void;

  /**
   * This method loads the device settings from the configured persistence layer.
   * Whilst this is normally used during startup, it can be called at any time to refresh the settings in case of manual changes within the database.
   */
  loadDeviceSettings(): void;

  /**
   * This mainly enforces all devices to have a toJSON method to ensure a consistent way of serializing devices.
   */
  toJSON(): Partial<iBaseDevice>;
}
