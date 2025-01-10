import { Utils } from '../../utils';
import { DeviceSettings } from './deviceSettings';
import { iShutterSettings } from '../../interfaces/settings/iShutterSettings';

export class ShutterSettings extends DeviceSettings implements iShutterSettings {
  /**
   * The time in ms it takes for the shutter to move to the top.
   * @default -1 (Not set)
   */
  public msTilTop: number = -1;
  /**
   * The time in ms it takes for the shutter to move to the bottom.
   * @default -1 (Not set)
   */
  public msTilBot: number = -1;
  /**
   * The direction this shutter is facing (0 = North, 180 = South)
   * @default 180 (Worst case scenario being south)
   */
  public direction: number = 180;
  /**
   * The desired position, when the shutter should perform a heat reduction.
   * @default 40
   */
  public heatReductionPosition: number = 40;
  /**
   * Some shutter give no position feedback on their own, so by knowing the durations in either direction,
   * we can programmatically trigger the callbacks.
   * @default false
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

  public toJSON(): Partial<ShutterSettings> {
    return Utils.jsonFilter(this);
  }
}
