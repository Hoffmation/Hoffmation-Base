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
   * The minimum temperature in degree celsius, from which on the shutter is closed purely as window insulation,
   * regardless of sun direction and cloudiness. At this point the ambient heat outweighs the solar gain.
   * @type {number}
   * @default 27
   */
  heatReductionThreshold: number;
  /**
   * The maximum angle in degrees between sun and window direction, for the sun to count as shining onto the window.
   * @type {number}
   * @default 50
   */
  heatReductionDirectionTolerance: number;
  /**
   * The cloudiness in percent up to which the full {@link heatReductionPosition} is used.
   * Above this value the target position is faded back towards the normal position.
   * @type {number}
   * @default 40
   */
  heatReductionCloudinessThreshold: number;
  /**
   * The cloudiness in percent from which on no heat reduction takes place at all,
   * as an overcast sky provides too little solar gain to justify a darkened room.
   * @type {number}
   * @default 80
   */
  heatReductionMaxCloudiness: number;
  /**
   *
   */
  triggerPositionUpdateByTime: boolean;
}
