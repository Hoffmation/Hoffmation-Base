// @ts-ignore
import config from '/server/config/private/mainConfig.json';
import { iConfig } from '../config/iConfig';

export class SettingsService {
  public static settings: iConfig = config as iConfig;

  public static get TelegramActive(): boolean {
    return this.settings.telegram !== undefined;
  }

  public static get Mp3Active(): boolean {
    return this.settings.mp3Server !== undefined;
  }
}
