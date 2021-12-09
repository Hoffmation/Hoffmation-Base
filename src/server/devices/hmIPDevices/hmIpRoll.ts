import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { Utils } from '../../services/utils/utils';
import { ServerLogService } from '../../services/log-service';
import { DeviceInfo } from '../DeviceInfo';
import { Fenster } from './Fenster';
import { FensterPosition } from './FensterPosition';
import { LogLevel } from '../../../models/logLevel';

export class HmIpRoll extends HmIPDevice {
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
    if (value !== this._currentLevel && this._fenster) {
      Utils.guardedNewThread(() => {
        this._fenster?.rolloPositionChange(value);
      }, this);
    }
    this._currentLevel = value;
  }

  public get desiredFensterLevel(): number {
    if (this._fenster === undefined) {
      return -1;
    }
    return this._fenster.desiredPosition;
  }

  private _currentLevel: number = -1;
  private _setLevelSwitchID: string;
  private _fenster?: Fenster;
  private _firstCommandRecieved: boolean = false;
  private _setLevel: number = -1;
  private _setLevelTime: number = -1;

  public set Fenster(value: Fenster) {
    this._fenster = value;
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpRoll);
    this._setLevelSwitchID = `${this.info.fullID}.4.LEVEL`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Rollo Update für "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
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
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Skipped initial Rollo "${this.info.customName}" to ${pPosition} as we recieved a command already`,
      );
      return;
    }
    if (this.currentLevel === pPosition) {
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Skip Rollo command for "${this.info.customName}" to Position ${pPosition} as this is the current one`,
      );
      return;
    }
    if (this._setLevelSwitchID === '') {
      ServerLogService.writeLog(
        LogLevel.Error,
        `Keine Switch ID für "${this.info.customName}" bekannt.`,
      );
      return;
    }

    if (!this.checkIoConnection(true)) {
      return;
    }

    if (this._fenster !== undefined) {
      if (this._fenster.griffeInPosition(FensterPosition.offen) > 0 && pPosition < 100) {
        if (!skipOpenWarning) {
          ServerLogService.writeLog(
            LogLevel.Alert,
            `Fahre Rollo "${this.info.customName}" nicht runter, weil das Fenster offen ist!`,
          );
        }
        return;
      }
      if (this._fenster.griffeInPosition(FensterPosition.kipp) > 0 && pPosition < 50) {
        pPosition = 50;
        if (!skipOpenWarning) {
          ServerLogService.writeLog(
            LogLevel.Alert,
            `Fahre Rollo "${this.info.customName}" nicht runter, weil das Fenster auf Kipp ist!`,
          );
        }
      }
    }

    this._setLevel = pPosition;
    ServerLogService.writeLog(LogLevel.Debug, `Fahre Rollo "${this.info.customName}" auf Position ${pPosition}`);
    this.setState(this._setLevelSwitchID, pPosition);
  }

  public down(initial: boolean = false): void {
    this.setLevel(0, initial);
  }

  public middle(): void {
    this.setLevel(50);
  }

  public up(initial: boolean = false): void {
    this.setLevel(100, initial);
  }
}
