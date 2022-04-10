import { DeviceSettings } from './deviceSettings';

export class ShutterSettings extends DeviceSettings {
  public msTilTop: number = -1;
  public msTilBot: number = -1;
  /**
   * Some shutter give no position feedback on their own, so by knowing the durations in either direction,
   * we can programmatically trigger the callbacks.
   * @type {boolean}
   */
  public triggerPositionUpdateByTime: boolean = false;
}
