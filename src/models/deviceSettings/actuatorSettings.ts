import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../utils/utils';

export class ActuatorSettings extends DeviceSettings {
  /**
   * Whether to turn on the device at dawn in time-based commands or automatic.
   */
  public dawnOn: boolean = true;
  /**
   * Whether to turn on the device at dusk in time-based commands or automatic.
   */
  public duskOn: boolean = true;
  /**
   * Whether to turn on the device at night in time-based commands or automatic.
   */
  public nightOn: boolean = true;
  /**
   * Whether to turn on the device at day in time-based commands or automatic.
   */
  public dayOn: boolean = false;
  /**
   * Indicates if this device controls e.g. an Eltako, which has it's own Turn Off Time logic.
   */
  public isStromStoss: boolean = false;

  /**
   * Whether after manually turning off a previously manually turned on device, fall back to automatic mode.
   * Instead of switching to a forced off state.
   */
  public resetToAutomaticOnForceOffAfterForceOn: boolean = true;

  /**
   * If this is an Actuator controling a time based relais,
   * this indicates the time after which we retrigger the relais.
   */
  public stromStossResendTime: number = 180;

  /**
   * Whether to include this device in the ambient light option.
   */
  public includeInAmbientLight: boolean = false;

  public override fromPartialObject(data: Partial<ActuatorSettings>): void {
    this.dawnOn = data.dawnOn ?? this.dawnOn;
    this.duskOn = data.duskOn ?? this.duskOn;
    this.nightOn = data.nightOn ?? this.nightOn;
    this.dayOn = data.dayOn ?? this.dayOn;
    this.isStromStoss = data.isStromStoss ?? this.isStromStoss;
    this.stromStossResendTime = data.stromStossResendTime ?? this.stromStossResendTime;
    this.resetToAutomaticOnForceOffAfterForceOn =
      data.resetToAutomaticOnForceOffAfterForceOn ?? this.resetToAutomaticOnForceOffAfterForceOn;
    this.includeInAmbientLight = data.includeInAmbientLight ?? this.includeInAmbientLight;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<ActuatorSettings> {
    return Utils.jsonFilter(this);
  }
}
