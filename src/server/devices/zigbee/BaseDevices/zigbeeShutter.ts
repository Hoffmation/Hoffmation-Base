import { DeviceType } from '../../deviceType';
import { LogDebugType, Utils } from '../../../services';
import { LogLevel, ShutterCalibration, ShutterSettings } from '../../../../models';
import { ZigbeeDevice } from './zigbeeDevice';
import { iShutter } from '../../baseDeviceInterfaces';
import { Fenster } from '../../groups';
import { FensterPosition } from '../../models';
import _ from 'lodash';
import { IoBrokerBaseDevice } from '../../IoBrokerBaseDevice';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';

export class ZigbeeShutter extends ZigbeeDevice implements iShutter {
  public settings: ShutterSettings = new ShutterSettings();
  protected _iMovementFinishTimeout: NodeJS.Timeout | null = null;
  protected _firstCommandRecieved: boolean = false;
  protected _setLevel: number = -1;
  protected _setLevelTime: number = -1;
  protected _shutterCalibrationData: ShutterCalibration = new ShutterCalibration(this.info.fullID, 0, 0, 0, 0);

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
    Utils.dbo
      ?.getShutterCalibration(this)
      .then((calibrationData: ShutterCalibration) => {
        this._shutterCalibrationData = calibrationData;
        this.log(LogLevel.DeepTrace, `ZigbeeShutter  initialized with calibration data`);
      })
      .catch((err: Error) => {
        this.log(LogLevel.Warn, `Failed to initialize Calibration data, err ${err?.message ?? err}`);
      });
  }

  protected _currentLevel: number = -1;

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

  protected _fenster?: Fenster;

  public get fenster(): Fenster | undefined {
    return this._fenster;
  }

  public set fenster(value: Fenster | undefined) {
    this._fenster = value;
  }

  public get desiredFensterLevel(): number {
    if (this._fenster === undefined) {
      return -1;
    }
    return this._fenster.desiredPosition;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    super.update(idSplit, state, initial, pOverride);
  }

  public setLevel(pPosition: number, initial: boolean = false, skipOpenWarning: boolean = false): void {
    if (!this._firstCommandRecieved && !initial) {
      this._firstCommandRecieved = true;
    } else if (this._firstCommandRecieved && initial) {
      this.log(LogLevel.Debug, `Skipped initial Rollo  to ${pPosition} as we recieved a command already`);
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

    if (this._fenster !== undefined) {
      if (this._fenster.griffeInPosition(FensterPosition.offen) > 0 && pPosition < 100) {
        if (!skipOpenWarning) {
          this.log(LogLevel.Alert, `Fahre Rollo  nicht runter, weil das Fenster offen ist!`);
        }
        return;
      }
      if (this._fenster.griffeInPosition(FensterPosition.kipp) > 0 && pPosition < 50) {
        pPosition = 50;
        if (!skipOpenWarning) {
          this.log(LogLevel.Alert, `Fahre Rollo  nicht runter, weil das Fenster auf Kipp ist!`);
        }
      }
    }

    this._setLevel = pPosition;
    this.log(LogLevel.Debug, `Move  to position ${pPosition}`);
    this.moveToPosition(pPosition);
  }

  public toJSON(): Partial<IoBrokerBaseDevice> {
    return _.omit(super.toJSON(), ['_fenster']);
  }

  protected moveToPosition(pPosition: number): void {
    this.log(LogLevel.Error, `Implement own moveToPosition(${pPosition}) Function`);
  }

  protected getAverageUp(): number {
    if (this._shutterCalibrationData.averageUp > 0) {
      return this._shutterCalibrationData.averageUp;
    }
    if (this.settings.msTilTop > 0) {
      return this.settings.msTilTop;
    }
    return 30000;
  }

  protected getAverageDown(): number {
    if (this._shutterCalibrationData.averageDown > 0) {
      return this._shutterCalibrationData.averageDown;
    }
    if (this.settings.msTilBot > 0) {
      return this.settings.msTilBot;
    }
    return 30000;
  }

  protected isCalibrated(): boolean {
    return this.getAverageDown() > 0 && this.getAverageUp() > 0;
  }

  protected persistCalibrationData(): void {
    this.log(
      LogLevel.Trace,
      `Persiting Calibration Data. Average Up: ${this._shutterCalibrationData.averageUp}, Down: ${this._shutterCalibrationData.averageDown}`,
    );
    Utils.dbo?.persistShutterCalibration(this._shutterCalibrationData);
  }

  protected initializeMovementFinishTimeout(duration: number, endPosition: number): void {
    if (this._iMovementFinishTimeout !== null) {
      clearTimeout(this._iMovementFinishTimeout);
    }
    this._iMovementFinishTimeout = Utils.guardedTimeout(
      () => {
        this.currentLevel = endPosition;
        this._iMovementFinishTimeout = null;
      },
      duration,
      this,
    );
  }
}
