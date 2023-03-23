import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../server';

export class VictronDeviceSettings extends DeviceSettings {
  public maxBatteryLoadWattage: number = 1700;
  public hasBattery: boolean = true;
  public hasGrid: boolean = true;
  public hasSolar: boolean = true;
  public batteryCapacityWattage: number = 10000;

  public fromPartialObject(data: Partial<VictronDeviceSettings>): void {
    this.maxBatteryLoadWattage = data.maxBatteryLoadWattage ?? this.maxBatteryLoadWattage;
    this.hasBattery = data.hasBattery ?? this.hasBattery;
    this.hasGrid = data.hasGrid ?? this.hasGrid;
    this.hasSolar = data.hasSolar ?? this.hasSolar;
    this.batteryCapacityWattage = data.batteryCapacityWattage ?? this.batteryCapacityWattage;
    super.fromPartialObject(data);
  }

  protected toJSON(): Partial<VictronDeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
