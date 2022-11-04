import { DeviceSettings } from './deviceSettings';

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

  public fromJsonObject(data: Partial<ActuatorSettings>): void {
    this.dawnOn = data.dawnOn ?? true;
    this.duskOn = data.duskOn ?? true;
    this.nightOn = data.nightOn ?? true;
    this.isStromStoss = data.isStromStoss ?? false;
    this.stromStossResendTime = data.stromStossResendTime ?? 180;
  }

  protected toJSON(): string {
    return JSON.stringify(this);
  }
}
