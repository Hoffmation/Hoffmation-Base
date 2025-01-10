import { iDeviceSettings } from '../deviceSettings';

/**
 *
 */
export interface iSceneSettings extends iDeviceSettings {
  /**
   * The default turn off timeout in ms for the scene or undefined if not desired.
   * @default undefined (No timeout)
   */
  defaultTurnOffTimeout?: number;
}
