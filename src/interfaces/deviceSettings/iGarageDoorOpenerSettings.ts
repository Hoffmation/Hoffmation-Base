import { iDeviceSettings } from './iDeviceSettings';

/**
 *
 */
export interface iGarageDoorOpenerSettings extends iDeviceSettings {
  /**
   *
   */
  invertSensor: boolean;

  /**
   *
   */
  fromPartialObject(data: Partial<iGarageDoorOpenerSettings>): void;

  /**
   *
   */
  toJSON(): Partial<iGarageDoorOpenerSettings>;
}
