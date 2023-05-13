import { Utils } from '../../server';
import { DeviceSettings } from './deviceSettings';

export class HandleSettings extends DeviceSettings {
  public informOnOpen: boolean = true;
  public informNotHelping: boolean = true;
  public informIsHelping: boolean = true;

  public fromPartialObject(data: Partial<HandleSettings>): void {
    this.informOnOpen = data.informOnOpen ?? this.informOnOpen;
    this.informNotHelping = data.informNotHelping ?? this.informNotHelping;
    this.informIsHelping = data.informIsHelping ?? this.informIsHelping;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<HandleSettings> {
    return Utils.jsonFilter(this);
  }
}
