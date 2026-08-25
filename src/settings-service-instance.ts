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
    // A coarse fallback so the sun times resolve at all when no location is configured. Deliberately not a
    // site: one decimal is roughly city scale, and this default is public.
    return 51.0;
  }

  public get longitude(): number {
    if (this.settings?.weather?.longitude !== undefined) {
      const longitude = parseFloat(this.settings.weather.longitude);
      if (!Number.isNaN(longitude)) {
        return longitude;
      }
    }
    // Coarse for the same reason as the latitude above.
    return 7.0;
  }

  public initialize(config: iConfig): void {
    this.settings = config;
  }
}
