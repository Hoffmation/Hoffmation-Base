import { Utils } from '../services/utils/utils';
import { ServerLogService } from '../services/log-service/log-service';
import { LogLevel } from '../../models/logLevel';

export class ButtonCapabilities {
  shortPress: boolean = true;
  doublePress: boolean = true;
  triplePress: boolean = true;
  longPress: boolean = true;
}

export enum ButtonPressType {
  short,
  long,
  double,
  triple,
}

export class Button {
  private _state: Map<ButtonPressType, boolean> = new Map<ButtonPressType, boolean>();
  private _callbacks: Map<ButtonPressType, Array<{ cb: (pValue: boolean) => void; description: string }>> = new Map<
    ButtonPressType,
    Array<{ cb: (pValue: boolean) => void; description: string }>
  >();
  private _timeouts: Map<ButtonPressType, null | NodeJS.Timeout> = new Map<ButtonPressType, NodeJS.Timeout | null>();

  public getState(type: ButtonPressType): boolean {
    return this._state.get(type) ?? false;
  }

  public constructor(public name: string, public buttonCapabilities: ButtonCapabilities) {
    if (buttonCapabilities.shortPress) {
      this._callbacks.set(ButtonPressType.short, []);
      this._timeouts.set(ButtonPressType.short, null);
      this._state.set(ButtonPressType.short, false);
    }
    if (buttonCapabilities.longPress) {
      this._callbacks.set(ButtonPressType.long, []);
      this._timeouts.set(ButtonPressType.long, null);
      this._state.set(ButtonPressType.long, false);
    }
    if (buttonCapabilities.doublePress) {
      this._callbacks.set(ButtonPressType.double, []);
      this._timeouts.set(ButtonPressType.double, null);
      this._state.set(ButtonPressType.double, false);
    }
    if (buttonCapabilities.triplePress) {
      this._callbacks.set(ButtonPressType.triple, []);
      this._timeouts.set(ButtonPressType.triple, null);
      this._state.set(ButtonPressType.triple, false);
    }
  }
  public addCb(
    buttonType: ButtonPressType,
    pCallback: (pValue: boolean) => void,
    description: string = 'Not described',
  ): void {
    const cbArr: Array<{ cb: (pValue: boolean) => void; description: string }> | undefined =
      this._callbacks.get(buttonType);
    if (cbArr === undefined) {
      ServerLogService.writeLog(
        LogLevel.Error,
        `This Button doesn't support press Type ${ButtonPressType[buttonType]}`,
      );
      return;
    }
    cbArr.push({ cb: pCallback, description: description });
  }

  public getDescription(): string {
    const description: string[] = [];
    for (const [key, arr] of this._callbacks.entries()) {
      for (const entry of arr) {
        description.push(`${ButtonPressType[key]}: "${entry.description}"`);
      }
    }
    return description.join('\n');
  }

  public updateState(type: ButtonPressType, pValue: boolean): void  {
    if (pValue === this._state.get(type)) {
      return;
    }

    this._state.set(type, pValue);
    if (!this._callbacks.has(type)) {
      ServerLogService.writeLog(LogLevel.Error, `This Button doesn't support press Type ${ButtonPressType[type]}`);
      return;
    }

    for (const c of this._callbacks.get(type) ?? []) {
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
}
