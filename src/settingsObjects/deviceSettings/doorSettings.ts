import { iDoorSettings } from '../../interfaces';
import { Utils } from '../../utils';
import { DeviceSettings } from './deviceSettings';

export class DoorSettings extends DeviceSettings implements iDoorSettings {
  /** @inheritdoc */
  public alertDingOnTelegram: boolean = false;

  public fromPartialObject(data: Partial<DoorSettings>): void {
    this.alertDingOnTelegram = data.alertDingOnTelegram ?? this.alertDingOnTelegram;
    super.fromPartialObject(data);
  }

  public toJSON(): Partial<DoorSettings> {
    return Utils.jsonFilter(this);
  }
}
