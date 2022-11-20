import { Utils } from '../server';
import { LogLevel } from './logLevel';
import { iIdHolder } from './iIdHolder';

export abstract class ObjectSettings {
  public persist(holder: iIdHolder) {
    Utils.dbo?.persistSettings(holder.id, JSON.stringify(this), holder.customName);
  }

  public initializeFromDb(holder: iIdHolder) {
    Utils.dbo?.loadSettings(holder.id).then((data) => {
      if (!data) {
        // Nothing in db yet
        return;
      }
      let obj: Partial<ObjectSettings> | null = null;
      try {
        obj = JSON.parse(data);
      } catch (e: any) {
        holder.log(LogLevel.Error, `Failed to parse Device Setting JSON (${e})`);
      }
      if (!obj) {
        return;
      }
      this.fromPartialObject(obj);
      if (JSON.stringify(this) !== data) {
        this.persist(holder);
      }
    });
  }

  public fromPartialObject(_obj: Partial<ObjectSettings>): void {
    // nothing yet
  }

  protected toJSON(): Partial<ObjectSettings> {
    return Utils.jsonFilter(this);
  }
}
