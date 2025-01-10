import { iIdHolder } from '../iIdHolder';

/**
 *
 */
export interface iObjectSettings {
  /**
   *
   */
  onChangeCb?: () => void;

  /**
   *
   */
  persist(holder: iIdHolder): void;

  /**
   * Loads the settings from the database
   * @param holder - The holder of the settings (e.g. a device)
   * @param loadDoneCb - Callback when loading is done
   */
  initializeFromDb(holder: iIdHolder, loadDoneCb?: () => void): void;

  /**
   *
   */
  fromPartialObject(_obj: Partial<iObjectSettings>): void;

  /**
   *
   */
  toJSON(): Partial<iObjectSettings>;
}
