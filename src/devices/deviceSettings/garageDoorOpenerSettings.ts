import { Utils } from '../../utils';
import { iGarageDoorOpenerSettings } from '../../interfaces/deviceSettings/iGarageDoorOpenerSettings';
import { DeviceSettings } from './deviceSettings';

export class GarageDoorOpenerSettings extends DeviceSettings implements iGarageDoorOpenerSettings {
  /**
   * In case the sensor detects open door instead of closed
   */
  public invertSensor: boolean = false;

  public fromPartialObject(data: Partial<GarageDoorOpenerSettings>): void {
    this.invertSensor = data.invertSensor ?? this.invertSensor;
    super.fromPartialObject(data);
  }

  public toJSON(): Partial<GarageDoorOpenerSettings> {
    return Utils.jsonFilter(this);
  }
}
