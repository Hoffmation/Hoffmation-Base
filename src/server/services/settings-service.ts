import { HeatingMode, iConfig } from '../config';

export class SettingsService {
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

  /**
   * @deprecated Only use in unit tests
   * @returns {iConfig}
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
