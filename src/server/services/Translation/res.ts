import { IRessourceObject, IRessources } from './iRessources';
import resJson from './resources.json';
import { iTranslationSettings } from '../../config';

export class Res {
  private static translations: IRessources;
  private static selectedLanguage: string;

  public static initialize(config: iTranslationSettings): void {
    this.selectedLanguage = config.language;
    this.translations = resJson;
  }

  /**
   * Retrieves a string like `Alarm system arming."`
   */
  public static alarmArmed(): string {
    return this.fill(this.translations.alarmArmed);
  }

  /**
   * Retrieves a string like `Alarm system will be armed in night mode. Sweet Dreams!"`
   */
  public static alarmNightModeArmed(): string {
    return this.fill(this.translations.alarmNightModeArmed);
  }

  /**
   * Retrieves a string like `"@P0" closed after @P1 minutes`
   */
  public static closedAfterMinutes(deviceCustomName: string, minutes: string): string {
    return this.fill(this.translations.closedAfterMinutes, [deviceCustomName, minutes]);
  }

  /**
   * Retrieves a string like `No more smoke: Danger in "@P0" resolved.`
   */
  public static fireAlarmEnd(roomName: string): string {
    return this.fill(this.translations.fireAlarmEnd, [roomName]);
  }

  /**
   * Retrieves a string like `Smoke detector "@P0" active. Possible fire in "@P1".`
   */
  public static fireAlarmRepeat(roomName: string, deviceCustomName: string): string {
    return this.fill(this.translations.fireAlarmRepeat, [roomName, deviceCustomName]);
  }

  /**
   * Retrieves a string like `Smoke detector "@P0" triggered. Possible fire in "@P1".`
   */
  public static fireAlarmStart(roomName: string, deviceCustomName: string): string {
    return this.fill(this.translations.fireAlarmStart, [roomName, deviceCustomName]);
  }

  /**
   * Retrieves a string like `Good Morning`
   */
  public static goodMorning(): string {
    return this.fill(this.translations.goodMorning);
  }

  /**
   * Retrieves a string like "Alarm. Intruder detected"
   */
  public static intruderAlarm(): string {
    return this.fill(this.translations.intruderAlarm);
  }

  /**
   * Retrieves a string like "Additional defense protocol initiated."
   */
  public static intruderAdditionalDefenseWarning(): string {
    return this.fill(this.translations.intruderAdditionalDefenseWarning);
  }

  /**
   * Retrieves a string like "Hello potential intruder! You're beeing recorded and the alarm protocol is initiated please leave the building immediately!"
   */
  public static intruderGreeting(): string {
    return this.fill(this.translations.intruderGreeting);
  }

  /**
   * Retrieves a string like "Leave now! The owners and additional emergency contacts are informed!"
   */
  public static intruderLeaveAndOwnerInformed(): string {
    return this.fill(this.translations.intruderLeaveAndOwnerInformed);
  }

  /**
   * Retrieves a string like "All shutter are opening, please leave immediatly."
   */
  public static intruderShutterUpPleaseLeave(): string {
    return this.fill(this.translations.intruderShutterUpPleaseLeave);
  }

  /**
   * Retrieves a string like `"@P0" just closed`
   */
  public static justClosed(deviceCustomName: string): string {
    return this.fill(this.translations.justClosed, [deviceCustomName]);
  }

  /**
   * Retrieves a string like `Vibration Alert from "@P0". I repeat: Alarm at "@P0"`
   */
  public static vibrationAlarm(deviceCustomName: string): string {
    return this.fill(this.translations.vibrationAlarm, [deviceCustomName]);
  }

  /**
   * Retrieves a string like `Water alarm end: Flooding in "@P0" over.`
   */
  public static waterAlarmEnd(roomName: string): string {
    return this.fill(this.translations.waterAlarmEnd, [roomName]);
  }

  /**
   * Retrieves a string like `"@P0" has triggered. Pool party in "@P1".`
   */
  public static waterAlarmRepeat(deviceCustomName: string, roomName: string): string {
    return this.fill(this.translations.waterAlarmRepeat, [deviceCustomName, roomName]);
  }

  /**
   * Retrieves a string like `"@P0" detects water. Possible pipe burst in "@P1".`
   */
  public static waterAlarmStart(deviceCustomName: string, roomName: string): string {
    return this.fill(this.translations.waterAlarmStart, [deviceCustomName, roomName]);
  }

  /**
   * Retrieves a string like "Vibration Alert from "@P0". I repeat: Alarm at "@P0""
   */
  public static welcomeHome(): string {
    return this.fill(this.translations.welcomeHome);
  }

  /**
   * Retrieves a string like `"@P0" was opened`
   */
  public static wasOpened(deviceCustomName: string): string {
    return this.fill(this.translations.wasOpened, [deviceCustomName]);
  }

  private static fill(ressource: IRessourceObject, replacements?: string[]): string {
    let result: string | undefined;
    switch (this.selectedLanguage) {
      case 'de':
        result = ressource.de;
        break;
    }
    if (result === undefined) {
      result = ressource.en;
    }
    if (!replacements) {
      return result;
    }
    for (let i = 0; i < replacements.length; i++) {
      const replacer: RegExp = new RegExp(`@P${i}`, 'g');
      result = result.replace(replacer, replacements[i]);
    }
    return result;
  }
}
