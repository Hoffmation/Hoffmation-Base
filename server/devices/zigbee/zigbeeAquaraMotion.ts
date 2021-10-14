import { LogLevel } from '../../../models/logLevel';
import { ServerLogService } from '../../services/log-service';
import { Persist } from '../../services/dbo/persist';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeDevice } from './zigbeeDevice';
import { ZigbeeDeviceType } from './zigbeeDeviceType';
import { iIlluminationSensor } from '../iIlluminationSensor';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { CurrentIlluminationDataPoint } from '../../../models/persistence/CurrentIlluminationDataPoint';
import { CountToday } from '../../../models/persistence/todaysCount';

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
    if (!this.ioConn) {
      ServerLogService.writeLog(LogLevel.Error, `No connection active for "${this.info.customName}".`);
      return;
    }

    this.ioConn.setState(this.occupancyTimeoutID, value, (err) => {
      if (err) {
        console.log(`Error occured while setting motion timeout: ${err}`);
        return;
      }
      this._motionTimeout = value;
    });
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
    super(pInfo, ZigbeeDeviceType.ZigbeeAquaraMotion);

    this.occupancyTimeoutID = `${this.info.fullID}.${this.occupancyTimeoutID}`;

    Persist.getCount(this).then((todayCount: CountToday) => {
      this.detectionsToday = todayCount.counter;
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Bewegungscounter "${this.info.customName}" vorinitialisiert mit ${this.detectionsToday}`,
      );
      this._initialized = true;
    });
  }

  public addMovementCallback(pCallback: (pValue: boolean) => void): void {
    this._movementDetectedCallback.push(pCallback);
  }

  public updateMovement(newState: boolean): void {
    if (!this._initialized && newState) {
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Bewegung für "${this.info.customName}" erkannt aber die Initialisierung aus der DB ist noch nicht erfolgt --> verzögern`,
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
        `Überspringe Bewegung für "${this.info.customName}" da bereits der Wert ${newState} vorliegt`,
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
    ServerLogService.writeLog(LogLevel.Debug, `Neuer Bewegunsstatus Wert für "${this.info.customName}": ${newState}`);

    if (newState) {
      this.startFallbackTimeout();
      this.detectionsToday++;
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Dies ist die ${this.detectionsToday} Bewegung für "${this.info.customName}"`,
      );
    }

    for (const c of this._movementDetectedCallback) {
      c(newState);
    }
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Stecker Update für "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
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
      case 'illumincance':
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
        this._illuminance = state.val as number;
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
