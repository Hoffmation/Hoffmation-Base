import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { LogDebugType, Utils } from '../../services';
import { Window } from '../groups';
import { WindowPosition } from '../models';
import { LogLevel } from '../../../models';
import { iShutter } from '../baseDeviceInterfaces';
import _ from 'lodash';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';

export class HmIpRoll extends HmIPDevice implements iShutter {
  private _setLevelSwitchID: string;
  private _firstCommandRecieved: boolean = false;
  private _setLevel: number = -1;
  private _setLevelTime: number = -1;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpRoll);
    this.deviceCapabilities.push(DeviceCapability.shutter);
    this._setLevelSwitchID = `${this.info.fullID}.4.LEVEL`;
    Utils.dbo?.getLastDesiredPosition(this).then((val) => {
      if (val.desiredPosition === -1) {
        return;
      }
      this._window?.setDesiredPosition(val.desiredPosition);
    });
  }

  private _currentLevel: number = -1;

  public get currentLevel(): number {
    if (this._setLevel !== -1 && this._currentLevel !== this._setLevel) {
      return this._setLevel;
    }
    return this._currentLevel;
  }

  public set currentLevel(value: number) {
    if (value !== this._setLevel && Utils.nowMS() - this._setLevelTime < 60 * 10000) {
      value = this._setLevel;
    }
    if (value !== this._currentLevel && this._window) {
      Utils.guardedNewThread(() => {
        this._window?.rolloPositionChange(value);
      }, this);
      this.persist();
    }
    this._currentLevel = value;
  }

  private _window?: Window;

  public get window(): Window | undefined {
    return this._window;
  }

  public set window(value: Window | undefined) {
    this._window = value;
  }

  public get desiredWindowShutterLevel(): number {
    if (this._window === undefined) {
      return -1;
    }
    return this._window.desiredPosition;
  }

  public persist(): void {
    Utils.dbo?.persistShutter(this);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Rollo Update : ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case '3':
        if (idSplit[4] === 'LEVEL') {
          this.currentLevel = state.val as number;
        }
        break;
    }
  }

  public setLevel(pPosition: number, initial: boolean = false, skipOpenWarning: boolean = false): void {
    if (!this._firstCommandRecieved && !initial) {
      this._firstCommandRecieved = true;
    }
    if (this._firstCommandRecieved && initial) {
      this.log(LogLevel.Debug, `Skipped initial Rollo to ${pPosition} as we recieved a command already`);
      return;
    }
    if (this.currentLevel === pPosition) {
      this.log(
        LogLevel.Debug,
        `Skip Rollo command to Position ${pPosition} as this is the current one`,
        LogDebugType.SkipUnchangedRolloPosition,
      );
      return;
    }
    if (this._setLevelSwitchID === '') {
      this.log(LogLevel.Error, `Keine Switch ID bekannt.`);
      return;
    }

    if (!this.checkIoConnection(true)) {
      return;
    }

    if (this._window !== undefined) {
      if (this._window.griffeInPosition(WindowPosition.offen) > 0 && pPosition < 100) {
        if (!skipOpenWarning) {
          this.log(LogLevel.Alert, `Not closing the shutter, as the window is open!`);
        }
        return;
      }
      if (this._window.griffeInPosition(WindowPosition.kipp) > 0 && pPosition < 50) {
        pPosition = 50;
        if (!skipOpenWarning) {
          this.log(LogLevel.Alert, `Not closing the shutter, as the window is half open!`);
        }
      }
    }

    this._setLevel = pPosition;
    this.log(LogLevel.Debug, `Fahre Rollo auf Position ${pPosition}`);
    this.setState(this._setLevelSwitchID, pPosition);
  }

  public toJSON(): Partial<IoBrokerBaseDevice> {
    return _.omit(super.toJSON(), ['_window']);
  }
}
