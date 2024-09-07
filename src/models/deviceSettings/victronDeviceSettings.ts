import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class VictronDeviceSettings extends DeviceSettings {
  /**
   * The maximum wattage that the battery can deliver to the house
   * @default 1700
   */
  public maxBatteryLoadWattage: number = 1700;
  /**
   * If the system has a battery
   * @default true
   */
  public hasBattery: boolean = true;

  /**
   * The minimum battery level for nighttime AC usage allowance
   */
  public minimumNightTimeAcBatteryLevel: number = 80;
  /**
   * The minimum battery level for early morning or evening hours AC usage allowance
   */
  public minimumTransientTimeAcBatteryLevel: number = 70;

  /**
   * The minimum battery level at which the system should be allowed to use AC
   */
  public minimumDayTimeAcBatteryLevel: number = 60;
  /**
   * If the system has a grid
   * @default true
   */
  public hasGrid: boolean = true;
  /**
   * If the system has solar panels
   * @default true
   */
  public hasSolar: boolean = true;
  /**
   * The capacity of the battery in watt-hours
   * @default 10000
   */
  public batteryCapacityWattage: number = 10000;
  /**
   * The normal base consumption of the house in wattage
   * @default 600
   */
  public normalBaseConsumptionWattage: number = 600;
  /**
   * The maximum wattage that the battery can deliver to the house
   * @default 3000
   */
  public maximumBatteryDischargeWattage: number = 3000;
  /**
   * The threshold (in Watts) at which the system should turn on excess energy consumers
   */
  public excessEnergyTurnOnThreshold: number = 500;
  /**
   * The threshold (in Watts) at which the system should turn off excess energy consumers
   */
  public excessEnergyTurnOffThreshold: number = 50;

  public fromPartialObject(data: Partial<VictronDeviceSettings>): void {
    this.maxBatteryLoadWattage = data.maxBatteryLoadWattage ?? this.maxBatteryLoadWattage;
    this.hasBattery = data.hasBattery ?? this.hasBattery;
    this.hasGrid = data.hasGrid ?? this.hasGrid;
    this.hasSolar = data.hasSolar ?? this.hasSolar;
    this.minimumNightTimeAcBatteryLevel = data.minimumNightTimeAcBatteryLevel ?? this.minimumNightTimeAcBatteryLevel;
    this.minimumTransientTimeAcBatteryLevel =
      data.minimumTransientTimeAcBatteryLevel ?? this.minimumTransientTimeAcBatteryLevel;
    this.minimumDayTimeAcBatteryLevel = data.minimumDayTimeAcBatteryLevel ?? this.minimumDayTimeAcBatteryLevel;
    this.batteryCapacityWattage = data.batteryCapacityWattage ?? this.batteryCapacityWattage;
    this.normalBaseConsumptionWattage = data.normalBaseConsumptionWattage ?? this.normalBaseConsumptionWattage;
    this.maximumBatteryDischargeWattage = data.maximumBatteryDischargeWattage ?? this.maximumBatteryDischargeWattage;
    this.excessEnergyTurnOnThreshold = data.excessEnergyTurnOnThreshold ?? this.excessEnergyTurnOnThreshold;
    this.excessEnergyTurnOffThreshold = data.excessEnergyTurnOffThreshold ?? this.excessEnergyTurnOffThreshold;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<VictronDeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
