import { iDeviceSettings } from './iDeviceSettings';

/**
 *
 */
export interface iDoorSettings extends iDeviceSettings {
  /**
   *
   */
  alertDingOnTelegram: boolean;

  /**
   *
   */
  fromPartialObject(data: Partial<iDoorSettings>): void;

  /**
   *
   */
  toJSON(): Partial<iDoorSettings>;
}
