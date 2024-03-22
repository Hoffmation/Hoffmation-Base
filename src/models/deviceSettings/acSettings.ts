import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';
import { ExcessEnergyConsumerSettings } from '../excessEnergyConsumerSettings';

export class AcSettings extends DeviceSettings {
  public energySettings: ExcessEnergyConsumerSettings = new ExcessEnergyConsumerSettings();
  public minimumHours: number = 0;
  public minimumMinutes: number = 0;
  public maximumHours: number = 24;
  public maximumMinutes: number = 0;
  /**
   * Heating can be forbidden completly e.g. for summer season
   * @type {boolean}
   */
  public heatingAllowed: boolean = false;
  /**
   * Whether we should ignore the room temperature and let the AC decide on its own
   * @type {boolean}
   */
  public useOwnTemperature: boolean = false;
  /**
   * Whether the AC should use automatic mode to decide on its own whether to heat or cool
   * !!Warning!! This can result in excessive energy consumption, as overshooting the temperature can result in the AC switching to the opposite mode
   * @type {boolean}
   */
  public useAutomatic: boolean = false;

  /**
   * Whether we should turn off AC-Cooling when someone is in the room
   * @type {boolean}
   */
  public noCoolingOnMovement: boolean = false;

  /**
   * Whether this AC should be turned off for some time manually
   * @type {boolean}
   */
  public manualDisabled: boolean = false;

  public fromPartialObject(data: Partial<AcSettings>): void {
    this.minimumHours = data.minimumHours ?? this.minimumHours;
    this.minimumMinutes = data.minimumMinutes ?? this.minimumMinutes;
    this.maximumHours = data.maximumHours ?? this.maximumHours;
    this.maximumMinutes = data.maximumMinutes ?? this.maximumMinutes;
    this.heatingAllowed = data.heatingAllowed ?? this.heatingAllowed;
    this.noCoolingOnMovement = data.noCoolingOnMovement ?? this.noCoolingOnMovement;
    this.useOwnTemperature = data.useOwnTemperature ?? this.useOwnTemperature;
    this.useAutomatic = data.useAutomatic ?? this.useAutomatic;
    this.manualDisabled = data.manualDisabled ?? this.manualDisabled;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<AcSettings> {
    return Utils.jsonFilter(this);
  }
}
