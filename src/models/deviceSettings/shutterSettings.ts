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

  public fromPartialObject(data: Partial<ShutterSettings>): void {
    this.msTilTop = data.msTilTop ?? this.msTilTop;
    this.msTilBot = data.msTilBot ?? this.msTilBot;
    this.triggerPositionUpdateByTime = data.triggerPositionUpdateByTime ?? this.triggerPositionUpdateByTime;
    super.fromPartialObject(data);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
