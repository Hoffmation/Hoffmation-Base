import { ZigbeeDevice } from './zigbeeDevice';
import { iShutter, iShutterCalibration, iWindow } from '../../../interfaces';
import { ShutterSettings } from '../../../settingsObjects';
import { ShutterSetLevelCommand, WindowSetDesiredPositionCommand } from '../../../command';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { CommandSource, DeviceCapability, DeviceType, LogDebugType, LogLevel, WindowPosition } from '../../../enums';
import { Utils } from '../../../utils';
import { ShutterPositionChangedAction } from '../../../action';
import { ShutterCalibration } from '../../../models';

export class ZigbeeShutter extends ZigbeeDevice implements iShutter {
  /** @inheritDoc */
  public settings: ShutterSettings = new ShutterSettings();
  protected _iMovementFinishTimeout: NodeJS.Timeout | null = null;
  protected _firstCommandRecieved: boolean = false;
  protected _setLevel: number = -1;
  protected _setLevelTime: number = -1;
  protected _shutterCalibrationData: ShutterCalibration = new ShutterCalibration(this.info.fullID, 0, 0, 0, 0);
  protected _currentLevel: number = -1;
  protected _window?: iWindow;

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
    this.deviceCapabilities.push(DeviceCapability.shutter);
    this.jsonOmitKeys.push('_window');
    this.dbo
      ?.getShutterCalibration(this)
      .then((calibrationData: iShutterCalibration) => {
        this._shutterCalibrationData = calibrationData;
        this.log(LogLevel.DeepTrace, 'ZigbeeShutter  initialized with calibration data');
      })
      .catch((err: Error) => {
        this.log(LogLevel.Warn, `Failed to initialize Calibration data, err ${err?.message ?? err}`);
      });
    this.dbo?.getLastDesiredPosition(this).then((val) => {
      if (val.desiredPosition >= -1) {
        this._window?.setDesiredPosition(
          new WindowSetDesiredPositionCommand(
            CommandSource.Automatic,
            val.desiredPosition,
            'Found persisted last desired position in DB',
          ),
        );
      }
    });
  }

  /** @inheritDoc */
  public get currentLevel(): number {
    if (this._setLevel !== -1 && this._currentLevel !== this._setLevel) {
      return this._setLevel;
    }
    return this._currentLevel;
  }

  /** @inheritDoc */
  public get window(): iWindow | undefined {
    return this._window;
  }

  /** @inheritDoc */
  public set window(value: iWindow | undefined) {
    this._window = value;
  }

  /** @inheritDoc */
  public get desiredWindowShutterLevel(): number {
    if (this._window === undefined) {
      return -1;
    }
    return this._window.desiredPosition;
  }

  /** @inheritDoc */
  public persist(): void {
    this.dbo?.persistShutter(this);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    super.update(idSplit, state, initial, pOverride);
  }

  /** @inheritDoc */
  public setLevel(c: ShutterSetLevelCommand): void {
    let pPosition: number = c.level;
    if (!this._firstCommandRecieved && !c.isInitial) {
      this._firstCommandRecieved = true;
    } else if (this._firstCommandRecieved && c.isInitial) {
      this.logCommand(c, `Skipped initial shutter to ${pPosition} as we recieved a command already`);
      return;
    }
    if (this.currentLevel === pPosition && !c.isForceAction) {
      this.logCommand(
        c,
        `Skip shutter command to Position ${pPosition} as this is the current one`,
        LogDebugType.SkipUnchangedRolloPosition,
      );
      return;
    }
    this.logCommand(c);

    if (this._window !== undefined) {
      if (this._window.griffeInPosition(WindowPosition.open) > 0 && pPosition < 100) {
        if (!c.skipOpenWarning) {
          this.log(LogLevel.Alert, 'Not closing the shutter, as the window is open!');
        }
        return;
      }
      if (this._window.griffeInPosition(WindowPosition.tilted) > 0 && pPosition < 50) {
        pPosition = 50;
        if (!c.skipOpenWarning) {
          this.log(LogLevel.Alert, 'Not closing the shutter, as the window is half open!');
        }
      }
    }

    this._setLevel = pPosition;
    this.log(LogLevel.Debug, `Move  to position ${pPosition}`);
    this.moveToPosition(pPosition);
  }

  protected setCurrentLevel(value: number, isInitial: boolean = false) {
    if (value !== this._setLevel && Utils.nowMS() - this._setLevelTime < 60 * 10000) {
      value = this._setLevel;
    }
    if (value !== this._currentLevel && this._window && !isInitial) {
      Utils.guardedNewThread(() => {
        this._window?.rolloPositionChange(new ShutterPositionChangedAction(this, value));
      }, this);
      this.persist();
    }
    this._currentLevel = value;
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
    this.dbo?.persistShutterCalibration(this._shutterCalibrationData);
  }

  protected initializeMovementFinishTimeout(duration: number, endPosition: number): void {
    if (this._iMovementFinishTimeout !== null) {
      clearTimeout(this._iMovementFinishTimeout);
    }
    this._iMovementFinishTimeout = Utils.guardedTimeout(
      () => {
        this.setCurrentLevel(endPosition, false);
        this._iMovementFinishTimeout = null;
      },
      duration,
      this,
    );
  }
}
