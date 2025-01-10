import { HeatingMode } from './enums';
import { iConfig } from './interfaces';

export class SettingsService {
  /**
   * The active settings for the Hoffmation system.
   */
  public static settings: iConfig;

  public static get TelegramActive(): boolean {
    return this.settings.telegram !== undefined;
  }

  public static get Mp3Active(): boolean {
    return this.settings.mp3Server !== undefined;
  }

  public static initialize(config: iConfig): void {
    this.settings = config;
  }

  public static get heatMode(): HeatingMode {
    return this.settings?.heaterSettings?.mode ?? HeatingMode.None;
  }

  public static get latitude(): number {
    if (this.settings?.weather?.lattitude !== undefined) {
      const lat = parseFloat(this.settings.weather.lattitude);
      if (!Number.isNaN(lat)) {
        return lat;
      }
    }
    return 51.529556852253826;
  }

  public static get longitude(): number {
    if (this.settings?.weather?.longitude !== undefined) {
      const longitude = parseFloat(this.settings.weather.longitude);
      if (!Number.isNaN(longitude)) {
        return longitude;
      }
    }
    return 7.097266042276687;
  }

  /**
   * Generates a fresh Test configuration.
   * @returns The test configuration.
   * @deprecated Only use in unit tests.
   */
  public static get testConfig(): iConfig {
    return {
      roomDefault: {
        rolloHeatReduction: true,
        roomIsAlwaysDark: false,
        lampenBeiBewegung: true,
        lichtSonnenAufgangAus: true,
        sonnenUntergangRollos: true,
        sonnenAufgangRollos: true,
        movementResetTimer: 240,
        sonnenUntergangRolloDelay: 15,
        sonnenUntergangLampenDelay: 15,
        sonnenUntergangRolloMaxTime: {
          hours: 21,
          minutes: 30,
        },
        sonnenAufgangRolloMinTime: {
          hours: 7,
          minutes: 30,
        },
        sonnenAufgangRolloDelay: 35,
        sonnenAufgangLampenDelay: 15,
        sonnenUntergangRolloAdditionalOffsetPerCloudiness: 0.25,
        lightIfNoWindows: false,
        ambientLightAfterSunset: false,
        includeLampsInNormalMovementLightning: false,
      },
      timeSettings: {
        nightStart: {
          hours: 23,
          minutes: 45,
        },
        nightEnd: {
          hours: 6,
          minutes: 30,
        },
      },
      translationSettings: {
        language: 'en',
      },
      ioBrokerUrl: '',
    };
  }
}
