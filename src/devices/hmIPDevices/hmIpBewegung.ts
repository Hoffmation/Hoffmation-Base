import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { iIlluminationSensor, iMotionSensor } from '../baseDeviceInterfaces';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { Utils } from '../../utils/utils';
import { LogLevel } from '../../logging';
import { MotionSensorSettings } from '../../models/deviceSettings';
import { MotionSensorAction } from '../../models/action';
import { CountToday } from '../../models/persistence';

export class HmIpBewegung extends HmIPDevice implements iIlluminationSensor, iMotionSensor {
  private static MOVEMENT_DETECTION: string = 'MOTION';
  // private static ILLUMINATION_DURING_MOVEMENT: string = 'CURRENT_ILLUMINATION';
  private static CURRENT_ILLUMINATION: string = 'ILLUMINATION';
  /** @inheritDoc */
  public settings: MotionSensorSettings = new MotionSensorSettings();
  /** @inheritDoc */
  public movementDetected: boolean = false;
  /** @inheritDoc */
  public detectionsToday: number = 0;
  private _movementDetectedCallback: Array<(action: MotionSensorAction) => void> = [];
  private initialized: boolean = false;
  private _fallBackTimeout: NodeJS.Timeout | undefined;
  private _lastMotionTime: number = 0;
  private _currentIllumination: number = -1;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpBewegung);
    this.deviceCapabilities.push(DeviceCapability.motionSensor);
    this.deviceCapabilities.push(DeviceCapability.illuminationSensor);
    if (!Utils.anyDboActive) {
      this.initialized = true;
    } else {
      Utils.dbo
        ?.motionSensorTodayCount(this)
        .then((todayCount: CountToday) => {
          this.detectionsToday = todayCount.count;
          this.log(LogLevel.Debug, `Bewegungscounter vorinitialisiert mit ${this.detectionsToday}`);
          this.initialized = true;
        })
        .catch((err: Error) => {
          this.log(LogLevel.Warn, `Failed to initialize Movement Counter, err ${err?.message ?? err}`);
        });
    }
  }

  /** @inheritDoc */
  public get timeSinceLastMotion(): number {
    return Math.floor((Utils.nowMS() - this._lastMotionTime) / 1000);
  }

  public get currentIllumination(): number {
    return this._currentIllumination;
  }

  private set currentIllumination(value: number) {
    this._currentIllumination = value;
    Utils.dbo?.persistIlluminationSensor(this);
  }

  public addMovementCallback(pCallback: (action: MotionSensorAction) => void): void {
    this._movementDetectedCallback.push(pCallback);
  }

  public persistMotionSensor(): void {
    Utils.dbo?.persistMotionSensor(this);
  }

  /** @inheritDoc */
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
        'Bewegung erkannt aber die Initialisierung aus der DB ist noch nicht erfolgt --> verzögern',
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
    this.persistMotionSensor();
    if (pVal) {
      this.startFallbackTimeout();
      this.detectionsToday++;
      this._lastMotionTime = Utils.nowMS();
      this.log(LogLevel.Trace, `Dies ist die ${this.detectionsToday} Bewegung `);
    }

    for (const c of this._movementDetectedCallback) {
      c(new MotionSensorAction(this));
    }
  }

  private resetFallbackTimeout(): void {
    if (this._fallBackTimeout) {
      this.log(LogLevel.Trace, 'Fallback Timeout zurücksetzen');
      clearTimeout(this._fallBackTimeout);
    }
  }

  private startFallbackTimeout(): void {
    this._fallBackTimeout = Utils.guardedTimeout(
      () => {
        this.log(LogLevel.Debug, 'Benötige Fallback Bewegungs Reset ');
        this._fallBackTimeout = undefined;
        this.updateMovement(false);
      },
      270000,
      this,
    );
  }
}
