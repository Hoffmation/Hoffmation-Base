import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class VictronDeviceSettings extends DeviceSettings {
  public maxBatteryLoadWattage: number = 1700;
  public hasBattery: boolean = true;
  public hasGrid: boolean = true;
  public hasSolar: boolean = true;
  public batteryCapacityWattage: number = 10000;
  public normalBaseConsumptionWattage: number = 600;
  public maximumBatteryDischargeWattage: number = 3000;
  public excessEnergyTurnOnThreshold: number = 500;
  public excessEnergyTurnOffThreshold: number = 50;

  public fromPartialObject(data: Partial<VictronDeviceSettings>): void {
    this.maxBatteryLoadWattage = data.maxBatteryLoadWattage ?? this.maxBatteryLoadWattage;
    this.hasBattery = data.hasBattery ?? this.hasBattery;
    this.hasGrid = data.hasGrid ?? this.hasGrid;
    this.hasSolar = data.hasSolar ?? this.hasSolar;
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
