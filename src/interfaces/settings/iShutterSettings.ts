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
   * The minimum temperature in degree celsius, to trigger heat reduction, when the sun is shining on window.
   * @type {number}
   * @default 24
   */
  heatReductionDirectionThreshold: number;
  /**
   * The minimum temperature in degree celsius, to trigger heat reduction regardless of direction
   * @type {number}
   * @default 27
   */
  heatReductionThreshold: number;
  /**
   *
   */
  triggerPositionUpdateByTime: boolean;
}
