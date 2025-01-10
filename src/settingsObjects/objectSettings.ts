import _ from 'lodash';
import { iIdHolder, iObjectSettings } from '../interfaces';
import { Utils } from '../utils';
import { Persistence } from '../services';
import { LogLevel } from '../enums';

export abstract class ObjectSettings implements iObjectSettings {
  /**
   * Callback to be fired when the settings change
   */
  public onChangeCb?: () => void;

  public persist(holder: iIdHolder) {
    Persistence.dbo?.persistSettings(holder.id, JSON.stringify(this), holder.customName);
  }

  /**
   * Loads the settings from the database
   * @param holder - The holder of the settings (e.g. a device)
   * @param loadDoneCb - Callback when loading is done
   */
  public initializeFromDb(holder: iIdHolder, loadDoneCb?: () => void) {
    Persistence.dbo?.loadSettings(holder.id).then((data) => {
      if (!data) {
        // Nothing in db yet
        return;
      }
      let obj: Partial<ObjectSettings> | null = null;
      try {
        obj = JSON.parse(data);
      } catch (e: unknown) {
        holder.log(LogLevel.Error, `Failed to parse Device Setting JSON (${e})`);
      }
      if (!obj) {
        return;
      }
      this.fromPartialObject(obj);
      if (JSON.stringify(this) !== data) {
        this.persist(holder);
      }
      loadDoneCb?.();
    });
  }

  public fromPartialObject(_obj: Partial<ObjectSettings>): void {
    if (this.onChangeCb) {
      this.onChangeCb();
    }
  }

  public toJSON(): Partial<ObjectSettings> {
    return Utils.jsonFilter(_.omit(this, ['onChangeCb']));
  }
}
