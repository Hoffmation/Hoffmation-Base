import { DeviceSettings } from './deviceSettings';

export class WindowSettings extends DeviceSettings {
  /**
   * The direction this window is facing (0 = North, 180 = South)
   * @type {number}
   */
  public direction?: number;

  public fromPartialObject(data: Partial<WindowSettings>): void {
    this.direction = data.direction ?? this.direction;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<WindowSettings> {
    return this;
  }
}
