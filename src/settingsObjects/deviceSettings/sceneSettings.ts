import { Utils } from '../../utils';
import { DeviceSettings } from './deviceSettings';
import { iSceneSettings } from '../../interfaces';

export class SceneSettings extends DeviceSettings implements iSceneSettings {
  /** @inheritdoc */
  public defaultTurnOffTimeout?: number;

  public fromPartialObject(data: Partial<SceneSettings>): void {
    this.defaultTurnOffTimeout = data.defaultTurnOffTimeout ?? this.defaultTurnOffTimeout;
    super.fromPartialObject(data);
  }

  public toJSON(): Partial<SceneSettings> {
    return Utils.jsonFilter(this);
  }
}
