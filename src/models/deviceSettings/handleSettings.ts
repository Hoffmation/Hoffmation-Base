import { Utils } from '../../server/index.js';
import { DeviceSettings } from './deviceSettings.js';

export class HandleSettings extends DeviceSettings {
  /**
   * Whether to inform the user when the handle is opened.
   */
  public informOnOpen: boolean = true;
  /**
   * Whether to inform the user when the handle (and respectivly the window) is not helping in regards to the outside temperature being beneficial for the inside temperature.
   */
  public informNotHelping: boolean = true;
  /**
   * Whether to inform the user when the handle (and respectivly the window) is helping in regards to the outside temperature being beneficial for the inside temperature.
   */
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
