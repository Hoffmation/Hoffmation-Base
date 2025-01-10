/* eslint-disable jsdoc/require-description */
import { IRessources } from './iRessources';
import resJson from './resources.json';
import { IRessourceObject } from './IRessourceObject';
import { iTranslationSettings } from '../../server';

export class Res {
  private static translations: IRessources;
  private static selectedLanguage: string;

  public static initialize(config: iTranslationSettings): void {
    this.selectedLanguage = config.language;
    this.translations = resJson;
  }

  /**
   * @returns Retrieves a string like `Alarm system arming."`
   */
  public static alarmArmed(): string {
    return this.fill(this.translations.alarmArmed);
  }

  /**
   * @returns Retrieves a string like `Alarm system will be armed in night mode. Sweet Dreams!"`
   */
  public static alarmNightModeArmed(): string {
    return this.fill(this.translations.alarmNightModeArmed);
  }

  /**
   * @param deviceCustomName - The custom name of the device
   * @param minutes - The minutes the device was closed after
   * @returns Retrieves a string like `"@P0" closed after @P1 minutes`
   */
  public static closedAfterMinutes(deviceCustomName: string, minutes: string): string {
    return this.fill(this.translations.closedAfterMinutes, [deviceCustomName, minutes]);
  }

  /**
   * @param roomName - The name of the room
   * @returns Retrieves a string like `No more smoke: Danger in "@P0" resolved.`
   */
  public static fireAlarmEnd(roomName: string): string {
    return this.fill(this.translations.fireAlarmEnd, [roomName]);
  }

  /**
   * @param roomName - The name of the room
   * @param deviceCustomName - The custom name of the device
   * @returns Retrieves a string like `Smoke detector "@P0" active. Possible fire in "@P1".`
   */
  public static fireAlarmRepeat(roomName: string, deviceCustomName: string): string {
    return this.fill(this.translations.fireAlarmRepeat, [roomName, deviceCustomName]);
  }

  /**
   * @param roomName - The name of the room
   * @param deviceCustomName - The custom name of the device
   * @returns Retrieves a string like `Smoke detector "@P0" triggered. Possible fire in "@P1".`
   */
  public static fireAlarmStart(roomName: string, deviceCustomName: string): string {
    return this.fill(this.translations.fireAlarmStart, [roomName, deviceCustomName]);
  }

  /**
   * @returns Retrieves a string like `Good Morning`
   */
  public static goodMorning(): string {
    return this.fill(this.translations.goodMorning);
  }

  /**
   * @returns Retrieves a string like "Alarm. Intruder detected"
   */
  public static intruderAlarm(): string {
    return this.fill(this.translations.intruderAlarm);
  }

  /**
   * @returns Retrieves a string like "Additional defense protocol initiated."
   */
  public static intruderAdditionalDefenseWarning(): string {
    return this.fill(this.translations.intruderAdditionalDefenseWarning);
  }

  /**
   * @returns Retrieves a string like "Hello potential intruder! You're beeing recorded and the alarm protocol is initiated please leave the building immediately!"
   */
  public static intruderGreeting(): string {
    return this.fill(this.translations.intruderGreeting);
  }

  /**
   * @returns Retrieves a string like "Leave now! The owners and additional emergency contacts are informed!"
   */
  public static intruderLeaveAndOwnerInformed(): string {
    return this.fill(this.translations.intruderLeaveAndOwnerInformed);
  }

  /**
   * @returns Retrieves a string like "All shutter are opening, please leave immediatly."
   */
  public static intruderShutterUpPleaseLeave(): string {
    return this.fill(this.translations.intruderShutterUpPleaseLeave);
  }

  /**
   * @param deviceCustomName - The custom name of the device
   * @returns Retrieves a string like `"@P0" just closed`
   */
  public static justClosed(deviceCustomName: string): string {
    return this.fill(this.translations.justClosed, [deviceCustomName]);
  }

  /**
   * @param deviceCustomName - The custom name of the device
   * @returns Retrieves a string like `Vibration Alert from "@P0". I repeat: Alarm at "@P0"`
   */
  public static vibrationAlarm(deviceCustomName: string): string {
    return this.fill(this.translations.vibrationAlarm, [deviceCustomName]);
  }

  /**
   * @param roomName - The name of the room
   * @returns Retrieves a string like `Water alarm end: Flooding in "@P0" over.`
   */
  public static waterAlarmEnd(roomName: string): string {
    return this.fill(this.translations.waterAlarmEnd, [roomName]);
  }

  /**
   * @param deviceCustomName - The custom name of the device
   * @param roomName - The name of the room
   * @returns Retrieves a string like `"@P0" has triggered. Pool party in "@P1".`
   */
  public static waterAlarmRepeat(deviceCustomName: string, roomName: string): string {
    return this.fill(this.translations.waterAlarmRepeat, [deviceCustomName, roomName]);
  }

  /**
   * @param deviceCustomName - The custom name of the device
   * @param roomName - The name of the room
   * @returns Retrieves a string like `"@P0" detects water. Possible pipe burst in "@P1".`
   */
  public static waterAlarmStart(deviceCustomName: string, roomName: string): string {
    return this.fill(this.translations.waterAlarmStart, [deviceCustomName, roomName]);
  }

  /**
   * @returns Retrieves a string like "Vibration Alert from "@P0". I repeat: Alarm at "@P0""
   */
  public static welcomeHome(): string {
    return this.fill(this.translations.welcomeHome);
  }

  /**
   * @param deviceCustomName - The custom name of the device
   * @returns Retrieves a string like `"@P0" was opened`
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
