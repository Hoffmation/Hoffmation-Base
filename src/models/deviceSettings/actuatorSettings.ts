import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class ActuatorSettings extends DeviceSettings {
  public dawnOn: boolean = true;
  public duskOn: boolean = true;
  public nightOn: boolean = true;
  /**
   * Indicates if this device controls e.g. an Eltako, which has it's own Turn Off Time logic.
   * @type {boolean}
   */
  public isStromStoss: boolean = false;

  /**
   * Whether after manually turning off a previously manually turned on device, fall back to automatic mode.
   * Instead of switching to a forced off state.
   * @type {boolean}
   */
  public resetToAutomaticOnForceOffAfterForceOn: boolean = true;

  /**
   * If this is an Actuator controling a time based relais,
   * this indicates the time after which we retrigger the relais.
   * @type {number}
   */
  public stromStossResendTime: number = 180;

  /**
   * Whether to include this device in the ambient light option.
   * @type {boolean}
   */
  public includeInAmbientLight: boolean = false;

  public fromPartialObject(data: Partial<ActuatorSettings>): void {
    this.dawnOn = data.dawnOn ?? this.dawnOn;
    this.duskOn = data.duskOn ?? this.duskOn;
    this.nightOn = data.nightOn ?? this.nightOn;
    this.isStromStoss = data.isStromStoss ?? this.isStromStoss;
    this.stromStossResendTime = data.stromStossResendTime ?? this.stromStossResendTime;
    this.resetToAutomaticOnForceOffAfterForceOn =
      data.resetToAutomaticOnForceOffAfterForceOn ?? this.resetToAutomaticOnForceOffAfterForceOn;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<ActuatorSettings> {
    return Utils.jsonFilter(this);
  }
}
