import { DeviceType } from '../deviceType';
import { CountToday } from '../../../models/persistence/todaysCount';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeDevice } from './zigbeeDevice';
import { Persist } from '../../services/dbo/persist';
import { LogLevel } from '../../../models/logLevel';

export class ZigbeeMotionSensor extends ZigbeeDevice {
  public movementDetected: boolean = false;
  public excludeFromNightAlarm: boolean = false;

  protected _timeSinceLastMotion: number = 0;
  protected _detectionsToday: number = 0;

  protected _initialized: boolean = false;
  protected _movementDetectedCallback: Array<(pValue: boolean) => void> = [];
  protected _needsMovementResetFallback: boolean = true;
  protected _fallBackTimeout: NodeJS.Timeout | undefined;

  // Time since last motion in seconds
  public get timeSinceLastMotion(): number {
    return this._timeSinceLastMotion;
  }

  public get detectionsToday(): number {
    return this._detectionsToday;
  }

  public set detectionsToday(pVal: number) {
    const oldVal: number = this._detectionsToday;
    this._detectionsToday = pVal;
    Persist.persistTodayCount(this, pVal, oldVal);
  }

  public constructor(pInfo: DeviceInfo, type: DeviceType) {
    super(pInfo, type);
    Persist.getCount(this)
      .then((todayCount: CountToday) => {
        this.detectionsToday = todayCount.counter;
        this.log(LogLevel.Debug, `Preinitialized movement counter with ${this.detectionsToday}`);
        this._initialized = true;
      })
      .catch((err: Error) => {
        this.log(LogLevel.Warn, `Failed to initialize movement counter, err ${err.message}`);
      });
  }

  /**
   * Adds a callback for when a motion state has changed.
   * @param pCallback Function that accepts the new state as parameter
   */
  public addMovementCallback(pCallback: (newState: boolean) => void): void {
    this._movementDetectedCallback.push(pCallback);
  }

  public updateMovement(newState: boolean): void {
    if (!this._initialized && newState) {
      this.log(LogLevel.Trace, `Movement recognized, but database initialization has not finished yet --> delay.`);
      Utils.guardedTimeout(
        () => {
          this.updateMovement(newState);
        },
        1000,
        this,
      );
      return;
    }

    if (newState === this.movementDetected) {
      this.log(LogLevel.Debug, `Skip movement because state is already ${newState}`);

      if (newState) {
        // Wenn ein Sensor sich nicht von alleine zurücksetzt, hier erzwingen.
        this.resetFallbackTimeout();
        this.startFallbackTimeout();
      }
      return;
    }

    this.resetFallbackTimeout();
    this.movementDetected = newState;
    this.log(LogLevel.Debug, `New movement state: ${newState}`);

    if (newState) {
      this.startFallbackTimeout();
      this.detectionsToday++;
      this.log(LogLevel.Trace, `This is movement no. ${this.detectionsToday}`);
    }

    for (const c of this._movementDetectedCallback) {
      c(newState);
    }
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Motion update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, pOverride);
    switch (idSplit[3]) {
      case 'occupancy':
        this.log(LogLevel.Trace, `Motion sensor: Update for motion state of ${this.info.customName}: ${state.val}`);
        this.updateMovement(state.val as boolean);
        break;
      case 'no_motion':
        this.log(
          (state.val as number) < 100 ? LogLevel.Trace : LogLevel.DeepTrace,
          `Motion sensor: Update for time since last motion of ${this.info.customName}: ${state.val}`,
        );
        this._timeSinceLastMotion = state.val as number;
        break;
    }
  }

  private resetFallbackTimeout(): void {
    if (this._fallBackTimeout) {
      this.log(LogLevel.Trace, `Fallback Timeout zurücksetzen`);
      clearTimeout(this._fallBackTimeout);
    }
  }

  private startFallbackTimeout(): void {
    if (!this._needsMovementResetFallback) {
      return;
    }
    this._fallBackTimeout = Utils.guardedTimeout(
      () => {
        this.log(LogLevel.Debug, `Benötige Fallback Bewegungs Reset`);
        this._fallBackTimeout = undefined;
        this.updateMovement(false);
      },
      270000,
      this,
    );
  }
}
