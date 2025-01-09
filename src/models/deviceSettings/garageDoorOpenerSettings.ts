import { DeviceSettings } from './deviceSettings.js';
import { Utils } from '../../server/index.js';

export class GarageDoorOpenerSettings extends DeviceSettings {
  /**
   * In case the sensor detects open door instead of closed
   */
  public invertSensor: boolean = false;

  public fromPartialObject(data: Partial<GarageDoorOpenerSettings>): void {
    this.invertSensor = data.invertSensor ?? this.invertSensor;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<GarageDoorOpenerSettings> {
    return Utils.jsonFilter(this);
  }
}
