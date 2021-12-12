import { RoomBase } from '../../../models/rooms/RoomBase';
import { DeviceType } from '../deviceType';
import { CountToday } from '../../../models/persistence/todaysCount';
import { ServerLogService } from '../../services/log-service';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeDevice } from './zigbeeDevice';
import { Persist } from '../../services/dbo/persist';
import { CurrentIlluminationDataPoint } from '../../../models/persistence/CurrentIlluminationDataPoint';
import { LogLevel } from '../../../models/logLevel';
import { iIlluminationSensor } from '../iIlluminationSensor';

export class ZigbeeAquaraMotion extends ZigbeeDevice implements iIlluminationSensor {
  public movementDetected: boolean = false;
  public excludeFromNightAlarm: boolean = false;
  public room: RoomBase | undefined = undefined;

  private _timeSinceLastMotion: number = 0;
  private _illuminance: number = 0;
  private _motionTimeout: number = 0;
  private _detectionsToday: number = 0;

  private _initialized: boolean = false;
  private _movementDetectedCallback: Array<(pValue: boolean) => void> = [];
  private _fallBackTimeout: NodeJS.Timeout | undefined;

  private occupancyTimeoutID = `occupancy_timeout`;

  // Currently measured brightness in lux
  public get currentIllumination(): number {
    return this._illuminance;
  }

  private set currentIllumination(value: number) {
    this._illuminance = value;
    Persist.persistCurrentIllumination(
      new CurrentIlluminationDataPoint(
        this.info.room,
        this.info.devID,
        value,
        new Date(),
        this.room?.LampenGroup.anyLightsOwn() ?? false,
      ),
    );
  }

  // Time since last motion in seconds
  public get timeSinceLastMotion(): number {
    return this._timeSinceLastMotion;
  }

  // Time after the last trigger until a motion event gets triggered again
  public get motionTimeout(): number {
    return this._motionTimeout;
  }

  public set motionTimeout(value: number) {
    this.setState(
      this.occupancyTimeoutID,
      value,
      () => {
        this._motionTimeout = value;
      },
      (err) => {
        console.log(`Error occurred while setting motion timeout: ${err}`);
      },
    );
  }

  public get detectionsToday(): number {
    return this._detectionsToday;
  }

  public set detectionsToday(pVal: number) {
    const oldVal: number = this._detectionsToday;
    this._detectionsToday = pVal;
    Persist.persistTodayCount(this, pVal, oldVal);
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAquaraMotion);

    this.occupancyTimeoutID = `${this.info.fullID}.${this.occupancyTimeoutID}`;

    Persist.getCount(this)
      .then((todayCount: CountToday) => {
        this.detectionsToday = todayCount.counter;
        ServerLogService.writeLog(
          LogLevel.Debug,
          `Preinitialized movement counter for "${this.info.customName}" with ${this.detectionsToday}`,
        );
        this._initialized = true;
      })
      .catch((err: Error) => {
        ServerLogService.writeLog(
          LogLevel.Warn,
          `Failed to initialize movement counter for "${this.info.customName}", err ${err.message}`,
        );
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
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Movement recognized for "${this.info.customName}", but database initialization has not finished yet --> delay.`,
      );
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
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Skip movement for "${this.info.customName}" because state is already ${newState}`,
      );

      if (newState) {
        // Wenn ein Sensor sich nicht von alleine zurücksetzt, hier erzwingen.
        this.resetFallbackTimeout();
        this.startFallbackTimeout();
      }
      return;
    }

    this.resetFallbackTimeout();
    this.movementDetected = newState;
    ServerLogService.writeLog(LogLevel.Debug, `New movement state for "${this.info.customName}": ${newState}`);

    if (newState) {
      this.startFallbackTimeout();
      this.detectionsToday++;
      ServerLogService.writeLog(
        LogLevel.Trace,
        `This is movement no. ${this.detectionsToday} for "${this.info.customName}"`,
      );
    }

    for (const c of this._movementDetectedCallback) {
      c(newState);
    }
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Motion update for "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'occupancy':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Motion sensor: Update for motion state of ${this.info.customName}: ${state.val}`,
        );
        this.updateMovement(state.val as boolean);
        break;
      case 'no_motion':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Motion sensor: Update for time since last motion of ${this.info.customName}: ${state.val}`,
        );
        this._timeSinceLastMotion = state.val as number;
        break;
      case 'illuminance':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Motion sensor: Update for illuminance of ${this.info.customName}: ${state.val}`,
        );
        this.currentIllumination = state.val as number;
        break;
      case 'occupancy_timeout':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Motion sensor: Update for motion timeout of ${this.info.customName}: ${state.val}`,
        );
        this._motionTimeout = state.val as number;
        break;
    }
  }

  private resetFallbackTimeout(): void {
    if (this._fallBackTimeout) {
      ServerLogService.writeLog(LogLevel.Trace, `Fallback Timeout für "${this.info.customName}" zurücksetzen`);
      clearTimeout(this._fallBackTimeout);
    }
  }

  private startFallbackTimeout(): void {
    this._fallBackTimeout = Utils.guardedTimeout(
      () => {
        ServerLogService.writeLog(LogLevel.Debug, `Benötige Fallback Bewegungs Reset für "${this.info.customName}"`);
        this._fallBackTimeout = undefined;
        this.updateMovement(false);
      },
      270000,
      this,
    );
  }
}
