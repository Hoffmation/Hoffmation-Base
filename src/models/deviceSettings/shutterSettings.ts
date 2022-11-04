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

  public fromJsonObject(data: Partial<ShutterSettings>): void {
    this.msTilTop = data.msTilTop ?? -1;
    this.msTilBot = data.msTilBot ?? -1;
    this.triggerPositionUpdateByTime = data.triggerPositionUpdateByTime ?? false;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
