import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class SceneSettings extends DeviceSettings {
  defaultTurnOffTimeout?: number;

  public fromPartialObject(data: Partial<SceneSettings>): void {
    this.defaultTurnOffTimeout = data.defaultTurnOffTimeout ?? this.defaultTurnOffTimeout;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<SceneSettings> {
    return Utils.jsonFilter(this);
  }
}
