import { Utils } from '../../utils';
import { iDachsDeviceSettings } from '../../interfaces';
import { ActuatorSettings } from './actuatorSettings';

export class DachsDeviceSettings extends ActuatorSettings implements iDachsDeviceSettings {
  /** @inheritDoc */
  public refreshIntervalTime: number = 30000;

  /** @inheritDoc */
  public batteryLevelTurnOnThreshold: number = -1;

  /** @inheritDoc */
  public batteryLevelBeforeNightTurnOnThreshold: number = -1;

  /** @inheritDoc */
  public batteryLevelAllowStartThreshold: number = 50;

  /** @inheritDoc */
  public batteryLevelPreventStartThreshold: number = 70;

  /** @inheritDoc */
  public batteryLevelPreventStartAtNightThreshold: number = 90;

  /** @inheritDoc */
  public batteryLevelHeatingRodThreshold: number = 80;

  /** @inheritDoc */
  public warmWaterDesiredMinTemp: number = 45;

  /** @inheritDoc */
  public winterMinimumHeatStorageTemp: number = 55;
  /** @inheritDoc */
  public winterMinimumPreNightHeatStorageTemp: number = 65;

  public fromPartialObject(data: Partial<DachsDeviceSettings>): void {
    this.refreshIntervalTime = data.refreshIntervalTime ?? this.refreshIntervalTime;
    this.batteryLevelBeforeNightTurnOnThreshold =
      data.batteryLevelBeforeNightTurnOnThreshold ?? this.batteryLevelBeforeNightTurnOnThreshold;
    this.batteryLevelTurnOnThreshold = data.batteryLevelTurnOnThreshold ?? this.batteryLevelTurnOnThreshold;
    this.batteryLevelHeatingRodThreshold = data.batteryLevelHeatingRodThreshold ?? this.batteryLevelHeatingRodThreshold;
    this.batteryLevelPreventStartThreshold =
      data.batteryLevelPreventStartThreshold ?? this.batteryLevelPreventStartThreshold;
    this.batteryLevelPreventStartAtNightThreshold =
      data.batteryLevelPreventStartAtNightThreshold ?? this.batteryLevelPreventStartAtNightThreshold;
    this.batteryLevelAllowStartThreshold = data.batteryLevelAllowStartThreshold ?? this.batteryLevelAllowStartThreshold;
    this.warmWaterDesiredMinTemp = data.warmWaterDesiredMinTemp ?? this.warmWaterDesiredMinTemp;
    this.winterMinimumHeatStorageTemp = data.winterMinimumHeatStorageTemp ?? this.winterMinimumHeatStorageTemp;
    this.winterMinimumPreNightHeatStorageTemp =
      data.winterMinimumPreNightHeatStorageTemp ?? this.winterMinimumPreNightHeatStorageTemp;
    super.fromPartialObject(data);
  }

  public toJSON(): Partial<DachsDeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
