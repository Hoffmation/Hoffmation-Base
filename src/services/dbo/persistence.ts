import { iPersist } from '../../interfaces';
import { ServerLogService } from '../../logging';
import { LogLevel } from '../../enums';
import { Utils } from '../../utils';

export class Persistence {
  private static _dbo: iPersist | undefined = undefined;
  /**
   * The persitence layer object
   * @returns The persistence layer
   */
  public static get dbo(): iPersist | undefined {
    if (this._dbo === undefined) {
      return undefined;
    }

    if (this._dbo.initialized === false) {
      const err: Error = new Error('Db is not yet initialized');
      ServerLogService.writeLog(LogLevel.Warn, 'Db is not yet initialized, Stack: ' + err.stack);
      return undefined;
    }
    return this._dbo;
  }

  public static set dbo(value: iPersist | undefined) {
    this._dbo = value;
  }

  public static get dboReady(): boolean {
    return this._dbo !== undefined && this._dbo.initialized;
  }

  public static async lazyDbo(retries: number = 5): Promise<iPersist | undefined> {
    if (this.dbo === undefined) {
      return undefined;
    }
    if (this.dbo.initialized) {
      return this.dbo;
    }
    if (retries == 0) {
      return undefined;
    }
    return new Promise((resolve) => {
      Utils.guardedTimeout(
        () => {
          resolve(Persistence.lazyDbo(retries - 1));
        },
        2000,
        this,
      );
    });
  }

  public static get anyDboActive(): boolean {
    return this.dbo !== undefined;
  }
}
