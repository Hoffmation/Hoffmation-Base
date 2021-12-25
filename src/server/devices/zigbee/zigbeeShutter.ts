import { DeviceType } from '../deviceType';
import { Utils } from '../../services/utils/utils';
import { ServerLogService } from '../../services/log-service';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models/logLevel';
import { ZigbeeDevice } from './zigbeeDevice';
import { iShutter } from '../iShutter';
import { Fenster } from '../Fenster';
import { FensterPosition } from '../models/FensterPosition';
import _ from 'lodash';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';

export class ZigbeeShutter extends ZigbeeDevice implements iShutter {
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

  public get fenster(): Fenster | undefined {
    return this._fenster;
  }

  public set fenster(value: Fenster | undefined) {
    this._fenster = value;
  }

  protected _currentLevel: number = -1;
  protected _fenster?: Fenster;
  protected _firstCommandRecieved: boolean = false;
  protected _setLevel: number = -1;
  protected _setLevelTime: number = -1;

  public constructor(pInfo: DeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    super.update(idSplit, state, initial, pOverride);
  }

  public setLevel(pPosition: number, initial: boolean = false, skipOpenWarning: boolean = false): void {
    if (!this._firstCommandRecieved && !initial) {
      this._firstCommandRecieved = true;
    } else if (this._firstCommandRecieved && initial) {
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
    ServerLogService.writeLog(LogLevel.Debug, `Move "${this.info.customName}" to position ${pPosition}`);
    this.moveToPosition(pPosition);
  }

  protected moveToPosition(pPosition: number): void {
    ServerLogService.writeLog(LogLevel.Error, `Implement own moveToPosition(${pPosition}) Function`);
  }

  public toJSON(): Partial<IoBrokerBaseDevice> {
    return _.omit(super.toJSON(), ['_fenster']);
  }
}
