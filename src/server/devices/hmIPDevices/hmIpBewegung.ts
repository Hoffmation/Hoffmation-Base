import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { CountToday } from '../../../models/persistence/todaysCount';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { CurrentIlluminationDataPoint } from '../../../models/persistence/CurrentIlluminationDataPoint';
import { LogLevel } from '../../../models/logLevel';
import { iIlluminationSensor } from '../iIlluminationSensor';
import { dbo } from '../../../index';

export class HmIpBewegung extends HmIPDevice implements iIlluminationSensor {
  public excludeFromNightAlarm: boolean = false;
  public movementDetected: boolean = false;
  private _detectionsToday: number = 0;
  private _movementDetectedCallback: Array<(pValue: boolean) => void> = [];
  private static MOVEMENT_DETECTION: string = 'MOTION';
  // private static ILLUMINATION_DURING_MOVEMENT: string = 'CURRENT_ILLUMINATION';
  private static CURRENT_ILLUMINATION: string = 'ILLUMINATION';
  private initialized: boolean = false;
  private _fallBackTimeout: NodeJS.Timeout | undefined;
  private _currentIllumination: number = -1;

  public get currentIllumination(): number {
    return this._currentIllumination;
  }

  private set currentIllumination(value: number) {
    this._currentIllumination = value;
    dbo?.persistCurrentIllumination(
      new CurrentIlluminationDataPoint(
        this.info.room,
        this.info.devID,
        value,
        new Date(),
        this.room?.LampenGroup?.anyLightsOwn() ?? false,
      ),
    );
  }

  public get detectionsToday(): number {
    return this._detectionsToday;
  }

  public set detectionsToday(pVal: number) {
    const oldVal: number = this._detectionsToday;
    this._detectionsToday = pVal;
    dbo?.persistTodayCount(this, pVal, oldVal);
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpBewegung);
    dbo?.getCount(this)
      .then((todayCount: CountToday) => {
        this.detectionsToday = todayCount.counter;
        this.log(LogLevel.Debug, `Bewegungscounter vorinitialisiert mit ${this.detectionsToday}`);
        this.initialized = true;
      })
      .catch((err: Error) => {
        this.log(LogLevel.Warn, `Failed to initialize Movement Counter, err ${err.message}`);
      });
  }

  public addMovementCallback(pCallback: (pValue: boolean) => void): void {
    this._movementDetectedCallback.push(pCallback);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Bewegungs Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);

    if (idSplit[3] !== '3') {
      // Nur die Infos in Kanal 3 sind relevant
      return;
    }

    switch (idSplit[4]) {
      case HmIpBewegung.MOVEMENT_DETECTION:
        this.updateMovement(state.val as boolean);
        break;
      case HmIpBewegung.CURRENT_ILLUMINATION:
        this.currentIllumination = state.val as number;
        break;
    }
  }

  public updateMovement(pVal: boolean): void {
    if (!this.initialized && pVal) {
      this.log(
        LogLevel.Trace,
        `Bewegung erkannt aber die Initialisierung aus der DB ist noch nicht erfolgt --> verzögern`,
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
      this.log(LogLevel.Debug, `Überspringe Bewegung da bereits der Wert ${pVal} vorliegt`);
      if (pVal) {
        this.resetFallbackTimeout();
        this.startFallbackTimeout();
      }
      return;
    }

    this.resetFallbackTimeout();
    this.movementDetected = pVal;
    this.log(LogLevel.Debug, `Neuer Bewegunsstatus Wert : ${pVal}`);
    if (pVal) {
      this.startFallbackTimeout();
      this.detectionsToday++;
      this.log(LogLevel.Trace, `Dies ist die ${this.detectionsToday} Bewegung `);
    }

    for (const c of this._movementDetectedCallback) {
      c(pVal);
    }
  }

  private resetFallbackTimeout(): void {
    if (this._fallBackTimeout) {
      this.log(LogLevel.Trace, `Fallback Timeout zurücksetzen`);
      clearTimeout(this._fallBackTimeout);
    }
  }

  private startFallbackTimeout(): void {
    this._fallBackTimeout = Utils.guardedTimeout(
      () => {
        this.log(LogLevel.Debug, `Benötige Fallback Bewegungs Reset `);
        this._fallBackTimeout = undefined;
        this.updateMovement(false);
      },
      270000,
      this,
    );
  }
}
