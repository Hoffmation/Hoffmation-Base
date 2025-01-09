import { ZigbeeShutter } from './BaseDevices';
import { DeviceType } from '../deviceType';
import { LogLevel } from '../../../models';
import { Utils } from '../../services';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

enum MovementState {
  Down = 30,
  Stop = 50,
  Up = 70,
}

export class ZigbeeIlluShutter extends ZigbeeShutter {
  private _movementStateId: string;
  private _movementState: MovementState = MovementState.Stop;
  private _movementStartMs: number = -1;
  private _movementStartPos: number = -1;
  private _iMovementTimeout: NodeJS.Timeout | undefined;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluShutter);
    this._movementStateId = `${this.info.fullID}.position`;
  }

  /** @inheritDoc */
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
      this.initializeMovementFinishTimeout(this.getAverageUp(), 100);
      return;
    }
    if (targetPosition === 0) {
      this.changeMovementState(MovementState.Down);
      this.initializeMovementFinishTimeout(this.getAverageUp(), 0);
      Utils.guardedTimeout(
        () => {
          this.changeMovementState(MovementState.Stop);
        },
        this.getAverageDown() + 1000,
        this,
      );
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
      Math.round(distance / 100) * (this._currentLevel > targetPosition ? this.getAverageDown() : this.getAverageUp());
    this.changeMovementState(direction);
    this.initializeMovementFinishTimeout(duration, targetPosition);
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
      this.log(LogLevel.Debug, `New Time-Until-Top measurement for ${this.info.customName}: ${timePassed}ms`);
      this.setCurrentLevel(this._setLevel);
      this._shutterCalibrationData.counterUp++;
      this._shutterCalibrationData.averageUp +=
        (timePassed - this._shutterCalibrationData.averageUp) / this._shutterCalibrationData.counterUp;
      this.persistCalibrationData();
      this.log(
        LogLevel.Trace,
        `New Measurment for shutter up (${this.getAverageUp()}ms), new Average: ${
          this._shutterCalibrationData.averageUp
        }`,
      );
      return;
    }
    if (this._movementStartPos === 100 && oldState === MovementState.Down && this._setLevel === 0) {
      this.log(LogLevel.Debug, `New Time-Until-Bottom measurement for ${this.info.customName}: ${timePassed}ms`);
      this.setCurrentLevel(this._setLevel);
      this._shutterCalibrationData.counterDown++;
      this._shutterCalibrationData.averageDown +=
        (timePassed - this._shutterCalibrationData.averageDown) / this._shutterCalibrationData.counterDown;
      this.persistCalibrationData();
      this.log(
        LogLevel.Trace,
        `New Measurment for shutter down (${this.getAverageDown()}ms), new Average: ${
          this._shutterCalibrationData.averageDown
        }`,
      );
      return;
    }

    if (!this.isCalibrated()) {
      return;
    }

    if (oldState === MovementState.Down) {
      this.setCurrentLevel(Math.min(this._currentLevel - Math.round((timePassed * 100) / this.getAverageDown()), 0));
    } else if (oldState === MovementState.Up) {
      this.setCurrentLevel(Math.max(this._currentLevel + Math.round((timePassed * 100) / this.getAverageUp()), 100));
    }
  }
}
