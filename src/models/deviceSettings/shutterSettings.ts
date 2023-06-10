import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class ShutterSettings extends DeviceSettings {
  public msTilTop: number = -1;
  public msTilBot: number = -1;
  /**
   * The direction this shutter is facing (0 = North, 180 = South)
   * @type {number}
   */
  public direction: number = 180;
  /**
   * The desired position, when the shutter should perform a heat reduction.
   * @type {number}
   */
  public heatReductionPosition: number = 40;
  /**
   * Some shutter give no position feedback on their own, so by knowing the durations in either direction,
   * we can programmatically trigger the callbacks.
   * @type {boolean}
   */
  public triggerPositionUpdateByTime: boolean = false;

  public fromPartialObject(data: Partial<ShutterSettings>): void {
    this.msTilTop = data.msTilTop ?? this.msTilTop;
    this.msTilBot = data.msTilBot ?? this.msTilBot;
    this.direction = data.direction ?? this.direction;
    this.heatReductionPosition = data.heatReductionPosition ?? this.heatReductionPosition;
    this.triggerPositionUpdateByTime = data.triggerPositionUpdateByTime ?? this.triggerPositionUpdateByTime;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<ShutterSettings> {
    return Utils.jsonFilter(this);
  }
}
