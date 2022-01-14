import { ZigbeeShutter } from './zigbeeShutter';
import { DeviceInfo } from '../DeviceInfo';
import { DeviceType } from '../deviceType';
import { LogLevel } from '../../../models/logLevel';
import { Utils } from '../../services/utils/utils';
import { Persist } from '../../services/dbo/persist';
import { ShutterCalibration } from '../../../models/persistence/ShutterCalibration';

enum MovementState {
  Down = 30,
  Stop = 50,
  Up = 70,
}

export class ZigbeeIlluShutter extends ZigbeeShutter {
  private _movementStateId: string;
  private _movementState: MovementState = MovementState.Stop;
  private _movementStartMs: number = -1;
  private _msTilTop: number = -1;
  private _msTilBot: number = -1;
  private _movementStartPos: number = -1;
  private _shutterCalibrationData: ShutterCalibration = new ShutterCalibration(this.info.fullID, 0, 0, 0, 0);
  private _iMovementTimeout: NodeJS.Timeout | undefined;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluShutter);
    this._movementStateId = `${this.info.fullID}.position`;
    // this.presenceStateID = `${this.info.fullID}.1.${HmIpPraezenz.PRESENCE_DETECTION}`;
    Persist.getShutterCalibration(this)
      .then((calibrationData: ShutterCalibration) => {
        this._shutterCalibrationData = calibrationData;
        this.log(LogLevel.DeepTrace, `IlluShutter  initialized with calibration data`);
      })
      .catch((err: Error) => {
        this.log(LogLevel.Warn, `Failed to initialize Calibration data, err ${err.message}`);
      });
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    switch (idSplit[3]) {
      case 'position':
        this.log(LogLevel.Trace, `Shutter Update for ${this.info.customName} to "${state.val}"`);
        this.processNewMovementState(state.val as number);
        break;
    }

    super.update(idSplit, state, initial, true);
  }

  protected override moveToPosition(targetPosition: number): void {
    if (this._movementState !== MovementState.Stop) {
      this.log(
        LogLevel.Info,
        `Delaying movement command for ${this.info.customName} as it is moving to prevent actuator damage`,
      );
      this.changeMovementState(MovementState.Stop);
      if (this._iMovementTimeout !== undefined) {
        clearTimeout(this._iMovementTimeout);
      }
      this._iMovementTimeout = Utils.guardedTimeout(
        () => {
          this._iMovementTimeout = undefined;
          this.moveToPosition(targetPosition);
        },
        2000,
        this,
      );
      return;
    }

    this._movementStartPos = this._currentLevel;
    if (targetPosition === 100) {
      this.changeMovementState(MovementState.Up);
      return;
    }
    if (targetPosition === 0) {
      this.changeMovementState(MovementState.Down);
      return;
    }
    if (!this.isCalibrated()) {
      this.log(
        LogLevel.Alert,
        `Can't move  to position "${targetPosition}" as it is not calibrated (Move it completly up, down, up first)`,
      );
      return;
    }

    const distance: number = Math.abs(this._currentLevel - targetPosition);
    const direction: MovementState = this._currentLevel > targetPosition ? MovementState.Down : MovementState.Up;
    const duration: number =
      Math.round(distance / 100) * (this._currentLevel > targetPosition ? this._msTilBot : this._msTilTop);
    this.changeMovementState(direction);
    Utils.guardedTimeout(
      () => {
        this.changeMovementState(MovementState.Stop);
      },
      duration,
      this,
    );
  }

  private changeMovementState(direction: MovementState) {
    this.log(LogLevel.Debug, `Set new MovementState to "${MovementState[direction]}"`);
    if (direction !== MovementState.Stop) {
      this._movementStartMs = Utils.nowMS();
    }
    this.setState(this._movementStateId, direction, () => {
      this._movementState = direction;
    });
  }

  private processNewMovementState(val: number) {
    const newState: MovementState = val <= 30 ? MovementState.Down : val >= 70 ? MovementState.Up : MovementState.Stop;
    this.log(LogLevel.Trace, `New Movementstate "${MovementState[val]}"`);
    if (newState !== MovementState.Stop) {
      this._movementState = newState;
      return;
    }
    const timePassed: number = Utils.nowMS() - this._movementStartMs;
    const oldState: MovementState = this._movementState;
    if (this._movementStartPos === 0 && oldState === MovementState.Up && this._setLevel === 100) {
      this._msTilTop = timePassed;
      this.log(LogLevel.Debug, `New Time-Until-Top measurement for ${this.info.customName}: ${timePassed}ms`);
      this.currentLevel = this._setLevel;
      this._shutterCalibrationData.counterUp++;
      this._shutterCalibrationData.averageUp +=
        (this._msTilTop - this._shutterCalibrationData.averageUp) / this._shutterCalibrationData.counterUp;
      this.persistCalibrationData();
      this.log(
        LogLevel.Trace,
        `New Measurment for shutter up (${this._msTilTop}ms), new Average: ${this._shutterCalibrationData.averageUp}`,
      );
      return;
    }
    if (this._movementStartPos === 100 && oldState === MovementState.Down && this._setLevel === 0) {
      this.log(LogLevel.Debug, `New Time-Until-Bottom measurement for ${this.info.customName}: ${timePassed}ms`);
      this._msTilBot = timePassed;
      this.currentLevel = this._setLevel;
      this._shutterCalibrationData.counterDown++;
      this._shutterCalibrationData.averageDown +=
        (this._msTilBot - this._shutterCalibrationData.averageDown) / this._shutterCalibrationData.counterDown;
      this.persistCalibrationData();
      this.log(
        LogLevel.Trace,
        `New Measurment for shutter down (${this._msTilBot}ms), new Average: ${this._shutterCalibrationData.averageDown}`,
      );
      return;
    }

    if (!this.isCalibrated()) {
      return;
    }

    if (oldState === MovementState.Down) {
      this.currentLevel = Math.min(this._currentLevel - Math.round((timePassed * 100) / this._msTilBot), 0);
    } else if (oldState === MovementState.Up) {
      this.currentLevel = Math.max(this._currentLevel + Math.round((timePassed * 100) / this._msTilBot), 100);
    }
  }

  private isCalibrated(): boolean {
    return this._shutterCalibrationData.averageUp > 0 && this._shutterCalibrationData.averageDown > 0;
  }

  private persistCalibrationData() {
    this.log(
      LogLevel.Trace,
      `Persiting Calibration Data. Average Up: ${this._shutterCalibrationData.averageUp}, Down: ${this._shutterCalibrationData.averageDown}`,
    );
    Persist.persistShutterCalibration(this._shutterCalibrationData);
  }
}
