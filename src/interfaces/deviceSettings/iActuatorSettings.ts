import { iDeviceSettings } from './iDeviceSettings';

/**
 *
 */
export interface iActuatorSettings extends iDeviceSettings {
  /**
   *
   */
  dawnOn: boolean;
  /**
   *
   */
  duskOn: boolean;
  /**
   *
   */
  nightOn: boolean;
  /**
   *
   */
  dayOn: boolean;
  /**
   *
   */
  isStromStoss: boolean;
  /**
   *
   */
  resetToAutomaticOnForceOffAfterForceOn: boolean;
  /**
   *
   */
  stromStossResendTime: number;
  /**
   *
   */
  includeInAmbientLight: boolean;

  /**
   *
   */
  fromPartialObject(data: Partial<iActuatorSettings>): void;

  /**
   *
   */
  toJSON(): Partial<iActuatorSettings>;
}
