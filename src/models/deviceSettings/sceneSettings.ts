import { DeviceSettings } from './deviceSettings';
import { iBaseDevice } from '../../server';

export class SceneSettings extends DeviceSettings {
  defaultTurnOffTimeout?: number;

  public fromPartialObject(data: Partial<SceneSettings>, device: iBaseDevice): void {
    this.defaultTurnOffTimeout = data.defaultTurnOffTimeout;
    this.persist(device);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
