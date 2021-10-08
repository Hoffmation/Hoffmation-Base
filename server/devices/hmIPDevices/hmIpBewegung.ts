import { LogLevel } from '../../../models/logLevel';
import { HmIPDevice } from './hmIpDevice';
import { HmIpDeviceType } from './hmIpDeviceType';
import { DeviceInfo } from '../DeviceInfo';
import { ServerLogService } from '../../services/log-service';
import { Persist } from '../../services/dbo/persist';
import { CountToday } from '../../../models/persistence/todaysCount';
import { Utils } from '../../services/utils/utils';

export class HmIpBewegung extends HmIPDevice {
  public excludeFromNightAlarm: boolean = false;
  public movementDetected: boolean = false;
  private _detectionsToday: number = 0;
  private _movementDetectedCallback: Array<(pValue: boolean) => void> = [];
  private static MOVEMENT_DETECTION: string = 'MOTION';
  private initialized: boolean = false;
  private fallBackTimeout: NodeJS.Timeout | undefined;

  public get detectionsToday(): number {
    return this._detectionsToday;
  }

  public set detectionsToday(pVal: number) {
    const oldVal: number = this._detectionsToday;
    this._detectionsToday = pVal;
    Persist.persistTodayCount(this, pVal, oldVal);
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, HmIpDeviceType.HmIpBewegung);
    Persist.getCount(this).then((todayCount: CountToday) => {
      this.detectionsToday = todayCount.counter;
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Bewegungscounter "${this.info.customName}" vorinitialisiert mit ${this.detectionsToday}`,
      );
      this.initialized = true;
    });
  }

  public addMovementCallback(pCallback: (pValue: boolean) => void): void {
    this._movementDetectedCallback.push(pCallback);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.Trace,
      `Bewegungs Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`,
    );
    super.update(idSplit, state, initial, true);

    if (idSplit[3] !== '3') {
      // Nur die Infos in Kanal 1 sind relevant
      return;
    }

    switch (idSplit[4]) {
      case HmIpBewegung.MOVEMENT_DETECTION:
        this.updateMovement(state.val as boolean);
        break;
    }
  }

  public updateMovement(pVal: boolean): void {
    if (!this.initialized && pVal) {
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Bewegung für "${this.info.customName}" erkannt aber die Initialisierung aus der DB ist noch nicht erfolgt --> verzögern`,
      );
      Utils.guardedTimeout(
        () => {
          this.updateMovement(pVal);
        },
        1000,
        this,
      );
      return;
    }
    if (pVal === this.movementDetected) {
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Überspringe Bewegung für "${this.info.customName}" da bereits der Wert ${pVal} vorliegt`,
      );
      if (pVal) {
        this.resetFallbackTimeout();
        this.startFallbackTimeout();
      }
      return;
    }

    this.resetFallbackTimeout();
    this.movementDetected = pVal;
    ServerLogService.writeLog(LogLevel.Debug, `Neuer Bewegunsstatus Wert für "${this.info.customName}": ${pVal}`);
    if (pVal) {
      this.startFallbackTimeout();
      this.detectionsToday++;
      ServerLogService.writeLog(
        LogLevel.Trace,
        `Dies ist die ${this.detectionsToday} Bewegung für "${this.info.customName}"`,
      );
    }

    for (const c of this._movementDetectedCallback) {
      c(pVal);
    }
  }

  private resetFallbackTimeout(): void {
    if (this.fallBackTimeout) {
      ServerLogService.writeLog(LogLevel.Trace, `Fallback Timeout für "${this.info.customName}" zurücksetzen`);
      clearTimeout(this.fallBackTimeout);
    }
  }

  private startFallbackTimeout(): void {
    this.fallBackTimeout = Utils.guardedTimeout(
      () => {
        ServerLogService.writeLog(LogLevel.Debug, `Benötige Fallback Bewegungs Reset für "${this.info.customName}"`);
        this.fallBackTimeout = undefined;
        this.updateMovement(false);
      },
      270000,
      this,
    );
  }
}
