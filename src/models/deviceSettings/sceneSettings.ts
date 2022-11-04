import { DeviceSettings } from './deviceSettings';

export class SceneSettings extends DeviceSettings {
  defaultTurnOffTimeout?: number;

  public fromPartialObject(data: Partial<SceneSettings>): void {
    this.defaultTurnOffTimeout = data.defaultTurnOffTimeout;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
