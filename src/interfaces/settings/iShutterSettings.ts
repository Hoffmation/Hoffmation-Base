import { iDeviceSettings } from '../deviceSettings';

/**
 *
 */
export interface iShutterSettings extends iDeviceSettings {
  /**
   *
   */
  msTilTop: number;
  /**
   *
   */
  msTilBot: number;
  /**
   *
   */
  direction: number;
  /**
   *
   */
  heatReductionPosition: number;
  /**
   *
   */
  triggerPositionUpdateByTime: boolean;
}
