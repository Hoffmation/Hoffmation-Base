import { Utils } from '/server/services/utils/utils';

export class HmIPTaste {
  public shortPressed: boolean = false;
  public longPressed: boolean = false;
  private _shortCallback: Array<(pValue: boolean) => void> = [];
  private _longCallback: Array<(pValue: boolean) => void> = [];
  private _shortResetTimeout: null | NodeJS.Timeout = null;
  private _longResetTimeout: null | NodeJS.Timeout = null;

  public constructor(public updateIndex: number) {}

  public addShortCallback(pCallback: (pValue: boolean) => void): void {
    this._shortCallback.push(pCallback);
  }

  public addLongCallback(pCallback: (pValue: boolean) => void): void {
    this._longCallback.push(pCallback);
  }

  public updateShort(pValue: boolean): void {
    if (pValue === this.shortPressed) {
      return;
    }

    this.shortPressed = pValue;

    for (const c of this._shortCallback) {
      c(pValue);
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
      c(pValue);
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
