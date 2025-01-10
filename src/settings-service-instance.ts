import { iConfig, iSettingsProvider } from './interfaces';
import { HeatingMode } from './enums';
import { BlockAutomaticCommand } from './command';

export class SettingsServiceInstance implements iSettingsProvider {
  public constructor(public settings: iConfig) {
    BlockAutomaticCommand.defaultDefaultCollisionSolving =
      settings.blockAutomaticHandlerDefaults?.defaultCollisionSolving;
    BlockAutomaticCommand.defaultBlockAutomaticDurationMS =
      settings.blockAutomaticHandlerDefaults?.blockAutomaticDurationMS;
    BlockAutomaticCommand.defaultRevertToAutomaticAtBlockLift =
      settings.blockAutomaticHandlerDefaults?.revertToAutomaticAtBlockLift;
  }

  public get TelegramActive(): boolean {
    return this.settings.telegram !== undefined;
  }

  public get Mp3Active(): boolean {
    return this.settings.mp3Server !== undefined;
  }

  public get heatMode(): HeatingMode {
    return this.settings?.heaterSettings?.mode ?? HeatingMode.None;
  }

  public get latitude(): number {
    if (this.settings?.weather?.lattitude !== undefined) {
      const lat = parseFloat(this.settings.weather.lattitude);
      if (!Number.isNaN(lat)) {
        return lat;
      }
    }
    return 51.529556852253826;
  }

  public get longitude(): number {
    if (this.settings?.weather?.longitude !== undefined) {
      const longitude = parseFloat(this.settings.weather.longitude);
      if (!Number.isNaN(longitude)) {
        return longitude;
      }
    }
    return 7.097266042276687;
  }

  public initialize(config: iConfig): void {
    this.settings = config;
  }
}
