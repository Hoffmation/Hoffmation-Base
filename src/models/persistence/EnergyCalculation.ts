import { LogLevel } from '../logLevel';
import { LogDebugType, SettingsService, Utils } from '../../server';

export class EnergyCalculation {
  public drawnKwH: number = 0;
  public injectedKwH: number = 0;
  public selfConsumedKwH: number = 0;
  public costDrawn: number = 0;
  public earnedInjected: number = 0;
  public savedSelfConsume: number = 0;
  public endMs: number = 0;
  public batteryStoredKwH: number = 0;
  // Battery Level in %
  public batteryLevel: number = 0.0;

  constructor(public startMs: number) {}

  public static persist(
    obj: EnergyCalculation,
    endMs: number,
    logger: (level: LogLevel, message: string, logDebugType?: LogDebugType) => void,
  ): boolean {
    if (obj.drawnKwH === 0 && obj.injectedKwH === 0 && obj.selfConsumedKwH === 0) {
      logger(LogLevel.Warn, `Not persisting energy Data, as all values are 0.`);
      return false;
    }
    if (!SettingsService.settings.energyManager?.wattagePrice) {
      logger(LogLevel.Warn, `Wattage price not set, assuming average of 34ct.`);
    }
    obj.endMs = endMs;
    obj.earnedInjected = Utils.round(
      obj.injectedKwH * (SettingsService.settings.energyManager?.injectWattagePrice ?? 0.06),
      4,
    );
    obj.savedSelfConsume = Utils.round(
      obj.selfConsumedKwH * (SettingsService.settings.energyManager?.wattagePrice ?? 0.35),
      4,
    );
    obj.costDrawn = Utils.round(obj.drawnKwH * (SettingsService.settings.energyManager?.wattagePrice ?? 0.35), 4);
    obj.injectedKwH = Utils.round(obj.injectedKwH, 4);
    obj.selfConsumedKwH = Utils.round(obj.selfConsumedKwH, 4);
    obj.drawnKwH = Utils.round(obj.drawnKwH, 4);
    obj.batteryStoredKwH = Utils.round(obj.batteryStoredKwH, 3);
    obj.batteryLevel = Utils.round(obj.batteryLevel, 3);
    Utils.dbo?.persistEnergyManager(obj);
    logger(LogLevel.Info, `Persisting energy Manager Data.`);
    return true;
  }
}
