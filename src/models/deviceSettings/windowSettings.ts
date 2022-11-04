import { DeviceSettings } from './deviceSettings';

export class WindowSettings extends DeviceSettings {
  /**
   * The direction this window is facing (0 = North, 180 = South)
   * @type {number}
   */
  public direction?: number;

  public fromJsonObject(data: Partial<WindowSettings>): void {
    this.direction = data.direction;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
