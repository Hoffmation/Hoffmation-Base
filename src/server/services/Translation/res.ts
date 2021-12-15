import { IRessourceObject, IRessources } from './iRessources';
import resJson from './resources.json';
import { iTranslationSettings } from '../../config/iConfig';

export class Res {
  private static translations: IRessources;
  private static selectedLanguage: string;

  public static initialize(config: iTranslationSettings): void {
    this.selectedLanguage = config.language;
    this.translations = resJson;
  }

  /**
   * Retrieves a string like `"@P0" closed after @P1 minutes`
   */
  public static closedAfterMinutes(deviceCustomName: string, minutes: string): string {
    return this.fill(this.translations.closedAfterMinutes, [deviceCustomName, minutes]);
  }

  /**
   * Retrieves a string like `"@P0" just closed`
   */
  public static justClosed(deviceCustomName: string): string {
    return this.fill(this.translations.justClosed, [deviceCustomName]);
  }

  /**
   * Retrieves a string like `"@P0" was opened`
   */
  public static wasOpened(deviceCustomName: string): string {
    return this.fill(this.translations.wasOpened, [deviceCustomName]);
  }

  private static fill(ressource: IRessourceObject, replacements: string[]): string {
    let result: string | undefined;
    switch (this.selectedLanguage) {
      case 'de':
        result = ressource.de;
        break;
    }
    if (result === undefined) {
      result = ressource.en;
    }
    for (let i = 0; i < replacements.length; i++) {
      const replacer: RegExp = new RegExp(`@P${i}`, 'g');
      result = result.replace(replacer, replacements[i]);
    }
    return result;
  }
}
