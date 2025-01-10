import { HmIPDevice } from './hmIpDevice';
import { iBatteryDevice, iCountToday, iIlluminationSensor, iMotionSensor } from '../../interfaces';
import { Battery } from '../sharedFunctions';
import { MotionSensorSettings } from '../deviceSettings';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability, DeviceType, LogLevel } from '../../enums';
import { Persistence } from '../../services';
import { Utils } from '../../utils';
import { MotionSensorAction } from '../../action';

export class HmIpPraezenz extends HmIPDevice implements iIlluminationSensor, iBatteryDevice, iMotionSensor {
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);
  // TODO: Add iPresenceSensor
  private static PRESENCE_DETECTION: string = 'PRESENCE_DETECTION_STATE';
  // private static ILLUMINATION_DURING_MOVEMENT: string = 'CURRENT_ILLUMINATION';
  private static CURRENT_ILLUMINATION: string = 'ILLUMINATION';
  /** @inheritDoc */
  public movementDetected: boolean = false;
  /** @inheritDoc */
  public settings: MotionSensorSettings = new MotionSensorSettings();
  private _movementDetectedCallback: Array<(action: MotionSensorAction) => void> = [];
  // private presenceStateID: string;
  private initialized: boolean = false;
  private _lastMotionTime: number = 0;
  private _detectionsToday: number = 0;
  private _currentIllumination: number = -1;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpPraezenz);
    this.deviceCapabilities.push(DeviceCapability.illuminationSensor);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
    this.deviceCapabilities.push(DeviceCapability.motionSensor);
    // this.presenceStateID = `${this.info.fullID}.1.${HmIpPraezenz.PRESENCE_DETECTION}`;
    if (!Persistence.anyDboActive) {
      this.initialized = true;
    } else {
      Persistence.dbo
        ?.motionSensorTodayCount(this)
        .then((todayCount: iCountToday) => {
          this.detectionsToday = todayCount.count;
          this.log(LogLevel.Debug, `Präsenzcounter vorinitialisiert mit ${this.detectionsToday}`);
          this.initialized = true;
        })
        .catch((err: Error) => {
          this.log(LogLevel.Warn, `Failed to initialize Movement Counter, err ${err?.message ?? err}`);
        });
    }
  }

  public get batteryLevel(): number {
    return this.battery.level;
  }

  public get timeSinceLastMotion(): number {
    return Math.floor((Utils.nowMS() - this._lastMotionTime) / 1000);
  }

  public get detectionsToday(): number {
    return this._detectionsToday;
  }

  public set detectionsToday(pVal: number) {
    this._detectionsToday = pVal;
  }

  public get currentIllumination(): number {
    return this._currentIllumination;
  }

  private set currentIllumination(value: number) {
    this._currentIllumination = value;
    this.dbo?.persistIlluminationSensor(this);
  }

  public addMovementCallback(pCallback: (action: MotionSensorAction) => void): void {
    this._movementDetectedCallback.push(pCallback);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Präzens Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);

    switch (idSplit[3]) {
      case '0':
        switch (idSplit[4]) {
          case 'OPERATING_VOLTAGE':
            this.battery.level = 100 * (((state.val as number) - 1.8) / 1.2);
            break;
        }
        break;
      case '1':
        switch (idSplit[4]) {
          case HmIpPraezenz.PRESENCE_DETECTION:
            this.updatePresence(state.val as boolean);
            break;
          case HmIpPraezenz.CURRENT_ILLUMINATION:
            this.currentIllumination = state.val as number;
            break;
        }
        break;
    }
  }

  public updatePresence(pVal: boolean): void {
    if (!this.initialized && pVal) {
      this.log(
        LogLevel.Debug,
        'Präsenz erkannt aber die Initialisierung aus der DB ist noch nicht erfolgt --> verzögern',
      );
      Utils.guardedTimeout(
        () => {
          this.updatePresence(pVal);
        },
        1000,
        this,
      );
      return;
    }
    if (pVal === this.movementDetected) {
      this.log(LogLevel.Debug, `Überspringe Präsenz da bereits der Wert ${pVal} vorliegt`);
      return;
    }

    this.movementDetected = pVal;
    this.persistMotionSensor();
    this.log(LogLevel.Debug, `Neuer Präsenzstatus Wert : ${pVal}`);

    if (pVal) {
      this.detectionsToday++;
      this._lastMotionTime = Utils.nowMS();
      this.log(LogLevel.Trace, `Dies ist die ${this.detectionsToday} Bewegung `);
    }
    for (const c of this._movementDetectedCallback) {
      c(new MotionSensorAction(this));
    }
  }

  public persistMotionSensor(): void {
    this.dbo?.persistMotionSensor(this);
  }
}
