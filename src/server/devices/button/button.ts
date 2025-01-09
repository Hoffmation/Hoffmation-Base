import { ServerLogService, Utils } from '../../services';
import { LogLevel } from '../../../models';
import { ButtonCapabilities } from './buttonCapabilities';
import { ButtonPressType } from './buttonPressType';
import { ButtonCallback } from './buttonCallback';

export class Button {
  private _statesMap: Map<ButtonPressType, boolean> = new Map<ButtonPressType, boolean>();
  private _callbacksMap: Map<ButtonPressType, Array<ButtonCallback>> = new Map<
    ButtonPressType,
    Array<ButtonCallback>
  >();
  private _timeouts: Map<ButtonPressType, null | NodeJS.Timeout> = new Map<ButtonPressType, NodeJS.Timeout | null>();

  public constructor(
    public name: string,
    public buttonCapabilities: ButtonCapabilities,
  ) {
    if (buttonCapabilities.shortPress) {
      this._callbacksMap.set(ButtonPressType.short, []);
      this._timeouts.set(ButtonPressType.short, null);
      this._statesMap.set(ButtonPressType.short, false);
    }
    if (buttonCapabilities.longPress) {
      this._callbacksMap.set(ButtonPressType.long, []);
      this._timeouts.set(ButtonPressType.long, null);
      this._statesMap.set(ButtonPressType.long, false);
    }
    if (buttonCapabilities.doublePress) {
      this._callbacksMap.set(ButtonPressType.double, []);
      this._timeouts.set(ButtonPressType.double, null);
      this._statesMap.set(ButtonPressType.double, false);
    }
    if (buttonCapabilities.triplePress) {
      this._callbacksMap.set(ButtonPressType.triple, []);
      this._timeouts.set(ButtonPressType.triple, null);
      this._statesMap.set(ButtonPressType.triple, false);
    }
  }

  public addCb(
    buttonType: ButtonPressType,
    pCallback: (pValue: boolean) => void,
    description: string = 'Not described',
  ): void {
    const cbArr: Array<ButtonCallback> | undefined = this._callbacksMap.get(buttonType);
    if (cbArr === undefined) {
      ServerLogService.writeLog(
        LogLevel.Error,
        `This Button doesn't support press Type ${ButtonPressType[buttonType]}`,
      );
      return;
    }
    cbArr.push({ cb: pCallback, description: description });
  }

  public isPressActive(type: ButtonPressType) {
    return this._statesMap.get(type);
  }

  public getDescription(): string {
    const description: string[] = [];
    for (const [key, arr] of this._callbacksMap.entries()) {
      for (const entry of arr) {
        description.push(`${ButtonPressType[key]}: "${entry.description}"`);
      }
    }
    return description.join('\n');
  }

  public updateState(type: ButtonPressType, pValue: boolean): void {
    if (pValue === this._statesMap.get(type)) {
      return;
    }

    this._statesMap.set(type, pValue);
    if (!this._callbacksMap.has(type)) {
      ServerLogService.writeLog(LogLevel.Error, `This Button doesn't support press Type ${ButtonPressType[type]}`);
      return;
    }

    for (const c of this._callbacksMap.get(type) ?? []) {
      c.cb(pValue);
    }

    if (!pValue) {
      return;
    }
    const timeout: NodeJS.Timeout | null = this._timeouts.get(type) ?? null;
    if (timeout !== null) {
      clearTimeout(timeout);
    }

    this._timeouts.set(
      type,
      Utils.guardedTimeout(
        () => {
          this.updateState(type, false);
        },
        5000,
        this,
      ),
    );
  }

  public toJSON(): Partial<Button> {
    return Utils.jsonFilter(this);
  }

  public press(pressType: ButtonPressType): Error | null {
    if (
      (pressType === ButtonPressType.long && !this.buttonCapabilities.longPress) ||
      (pressType === ButtonPressType.short && !this.buttonCapabilities.shortPress) ||
      (pressType === ButtonPressType.double && !this.buttonCapabilities.doublePress) ||
      (pressType === ButtonPressType.triple && !this.buttonCapabilities.triplePress)
    ) {
      return new Error(`This Button doesn't support press Type ${ButtonPressType[pressType]}`);
    }
    this.updateState(pressType, true);
    Utils.guardedTimeout(
      () => {
        this.updateState(pressType, false);
      },
      200,
      this,
    );
    return null;
  }
}
