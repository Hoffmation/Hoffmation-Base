import { Utils } from '../services/utils/utils';

export class Taste {
  public shortPressed: boolean = false;
  public longPressed: boolean = false;
  private _shortCallback: Array<{cb: (pValue: boolean) => void, description: string}> = [];
  private _longCallback: Array<{cb: (pValue: boolean) => void, description: string}> = [];
  private _shortResetTimeout: null | NodeJS.Timeout = null;
  private _longResetTimeout: null | NodeJS.Timeout = null;

  public constructor(public updateIndex: number) {}

  public addShortCallback(pCallback: (pValue: boolean) => void, description: string = "Not described") : void {
    this._shortCallback.push({cb: pCallback, description: description});
  }

  public addLongCallback(pCallback: (pValue: boolean) => void, description: string = "Not described"): void {
    this._longCallback.push({cb: pCallback, description: description});
  }


  public getDescription(): string {
    const description: string[] = [];
    for (const c of this._shortCallback) {
      description.push(`Short Press: "${c.description}"`)
    }
    for (const c of this._longCallback) {
      description.push(`Long Press: "${c.description}"`)
    }
    return description.join('\n');
  }

  public updateShort(pValue: boolean): void {
    if (pValue === this.shortPressed) {
      return;
    }

    this.shortPressed = pValue;

    for (const c of this._shortCallback) {
      c.cb(pValue);
    }

    if (!pValue) {
      return;
    }

    this._shortResetTimeout !== null && clearTimeout(this._shortResetTimeout);

    this._shortResetTimeout = Utils.guardedTimeout(
      () => {
        this.updateShort(false);
      },
      1000,
      this,
    );
  }

  public updateLong(pValue: boolean): void {
    if (pValue === this.longPressed) {
      return;
    }

    this.longPressed = pValue;

    for (const c of this._longCallback) {
      c.cb(pValue);
    }

    if (!pValue) {
      return;
    }

    this._longResetTimeout !== null && clearTimeout(this._longResetTimeout);

    this._longResetTimeout = Utils.guardedTimeout(
      () => {
        this.updateLong(false);
      },
      5000,
      this,
    );
  }
}
