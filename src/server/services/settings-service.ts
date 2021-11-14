import { iConfig } from '../config/iConfig';

export class SettingsService {
  public static settings: iConfig;
  public static initialize(config: iConfig): void {
    this.settings = config;
  }

  public static get TelegramActive(): boolean {
    return this.settings.telegram !== undefined;
  }

  public static get Mp3Active(): boolean {
    return this.settings.mp3Server !== undefined;
  }
}
