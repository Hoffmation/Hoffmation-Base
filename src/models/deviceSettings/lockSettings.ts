import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class LockSettings extends DeviceSettings {
  public fromPartialObject(data: Partial<LockSettings>): void {
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<LockSettings> {
    return Utils.jsonFilter(this);
  }
}
