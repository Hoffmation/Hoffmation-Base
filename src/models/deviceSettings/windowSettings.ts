import { DeviceSettings } from './deviceSettings';
import { iBaseDevice } from '../../server';

export class WindowSettings extends DeviceSettings {
  /**
   * The direction this window is facing (0 = North, 180 = South)
   * @type {number}
   */
  public direction?: number;

  public fromPartialObject(data: Partial<WindowSettings>, device: iBaseDevice): void {
    this.direction = data.direction ?? this.direction;
    this.persist(device);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
