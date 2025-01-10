import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../utils';

export class SceneSettings extends DeviceSettings {
  /**
   * The default turn off timeout in ms for the scene or undefined if not desired.
   * @default undefined (No timeout)
   */
  defaultTurnOffTimeout?: number;

  public fromPartialObject(data: Partial<SceneSettings>): void {
    this.defaultTurnOffTimeout = data.defaultTurnOffTimeout ?? this.defaultTurnOffTimeout;
    super.fromPartialObject(data);
  }

  public toJSON(): Partial<SceneSettings> {
    return Utils.jsonFilter(this);
  }
}
