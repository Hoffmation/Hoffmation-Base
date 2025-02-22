import { LogDebugType, LogLevel } from '../../enums';
import { Persistence } from '../../services';
import { Utils } from '../../utils';
import { SettingsService } from '../../settings-service';
import { iEnergyCalculation } from '../../interfaces';

export class EnergyCalculation implements iEnergyCalculation {
  /**
   * The amount of energy drawn from the grid in kWh since the last calculation
   */
  public drawnKwH: number = 0;
  /**
   * The amount of energy injected into the grid in kWh since the last calculation
   */
  public injectedKwH: number = 0;
  /**
   * The amount of energy self consumed in kWh since the last calculation
   */
  public selfConsumedKwH: number = 0;
  /**
   * The cost of the energy drawn from the grid since the last calculation
   */
  public costDrawn: number = 0;
  /**
   * The money earned by injecting energy into the grid since the last calculation
   */
  public earnedInjected: number = 0;
  /**
   * The amount of money saved by self consuming energy since the last calculation
   */
  public savedSelfConsume: number = 0;
  /**
   * The timestamp of the end of this calculation
   */
  public endMs: number = 0;
  /**
   * The amount of energy stored in the battery in kWh since the last calculation
   */
  public batteryStoredKwH: number = 0;
  /**
   * Current battery level in %
   */
  public batteryLevel: number = 0.0;

  constructor(public startMs: number) {}

  public static persist(
    obj: iEnergyCalculation,
    endMs: number,
    logger: (level: LogLevel, message: string, logDebugType?: LogDebugType) => void,
  ): boolean {
    if (obj.drawnKwH === 0 && obj.injectedKwH === 0 && obj.selfConsumedKwH === 0) {
      logger(LogLevel.Warn, 'Not persisting energy Data, as all values are 0.');
      return false;
    }
    if (!SettingsService.settings.energyManager?.wattagePrice) {
      logger(LogLevel.Warn, 'Wattage price not set, assuming average of 34ct.');
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
    Persistence.dbo?.persistEnergyManager(obj);
    logger(LogLevel.Info, 'Persisting energy Manager Data.');
    return true;
  }
}
