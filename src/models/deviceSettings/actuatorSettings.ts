import { DeviceSettings } from './deviceSettings';
import { iBaseDevice } from '../../server';

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
   * If this is an Actuator controling a time based relais,
   * this indicates the time after which we retrigger the relais.
   * @type {number}
   */
  public stromStossResendTime: number = 180;

  public fromPartialObject(data: Partial<ActuatorSettings>, device: iBaseDevice): void {
    this.dawnOn = data.dawnOn ?? this.dawnOn;
    this.duskOn = data.duskOn ?? this.duskOn;
    this.nightOn = data.nightOn ?? this.nightOn;
    this.isStromStoss = data.isStromStoss ?? this.isStromStoss;
    this.stromStossResendTime = data.stromStossResendTime ?? this.stromStossResendTime;
    super.fromPartialObject(data, device);
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
