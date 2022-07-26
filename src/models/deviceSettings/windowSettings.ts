import { DeviceSettings } from './deviceSettings';

export class WindowSettings extends DeviceSettings {
  /**
   * The direction this window is facing (0 = North, 180 = South)
   * @type {number}
   */
  public direction?: number;
}
