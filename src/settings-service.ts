import { HeatingMode } from './enums';
import { iConfig, iSettingsProvider } from './interfaces';
import { SettingsServiceInstance } from './settings-service-instance';

export class SettingsService {
  private static _instance: iSettingsProvider;
  public static get instance(): iSettingsProvider {
    this._instance ??= new SettingsServiceInstance(this.settings);
    return this._instance;
  }

  /**
   * The active settings for the Hoffmation system.
   */
  public static settings: iConfig;

  public static get TelegramActive(): boolean {
    return this.instance.TelegramActive;
  }

  public static get Mp3Active(): boolean {
    return this.instance.Mp3Active;
  }

  public static get heatMode(): HeatingMode {
    return this.instance.heatMode;
  }

  public static get latitude(): number {
    return this.instance.latitude;
  }

  public static get longitude(): number {
    return this.instance.longitude;
  }

  public static initialize(config: iConfig): void {
    this.settings = config;
    this._instance = new SettingsServiceInstance(config);
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
