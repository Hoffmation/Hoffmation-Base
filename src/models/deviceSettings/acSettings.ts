import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';
import { ExcessEnergyConsumerSettings } from '../excessEnergyConsumerSettings';

export class AcSettings extends DeviceSettings {
  /** The energy consumer settings for this AC */
  public energySettings: ExcessEnergyConsumerSettings = new ExcessEnergyConsumerSettings();
  /**
   * The earliest hour the AC can be turned on
   */
  public minimumHours: number = 0;
  /**
   * The earliest minute the AC can be turned on within the hour {@link minimumHours}
   */
  public minimumMinutes: number = 0;
  /**
   * The latest hour the AC can be turned on
   */
  public maximumHours: number = 24;
  /**
   * The latest minute the AC can be turned on within the hour {@link maximumHours}
   */
  public maximumMinutes: number = 0;
  /**
   * Heating can be forbidden completly e.g. for summer season
   */
  public heatingAllowed: boolean = false;
  /**
   * Whether we should ignore the room temperature and let the AC decide on its own
   */
  public useOwnTemperature: boolean = false;
  /**
   * Whether the AC should use automatic mode to decide on its own whether to heat or cool
   * @warning This can result in excessive energy consumption, as overshooting the temperature can result in the AC switching to the opposite mode
   */
  public useAutomatic: boolean = false;

  /**
   * Whether we should turn off AC-Cooling when someone is in the room
   */
  public noCoolingOnMovement: boolean = false;

  /**
   * Whether this AC should be turned off for some time manually
   */
  public manualDisabled: boolean = false;

  /**
   * The minimum outside temperature (max. of day)  in Celsius to even consider cooling.
   */
  public minOutdoorTempForCooling: number = 21;

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
    this.minOutdoorTempForCooling = data.minOutdoorTempForCooling ?? this.minOutdoorTempForCooling;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<AcSettings> {
    return Utils.jsonFilter(this);
  }
}
