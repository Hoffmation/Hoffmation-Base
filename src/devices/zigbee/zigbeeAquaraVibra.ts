import * as console from 'console';
import { ZigbeeDevice } from './BaseDevices';
import { iBatteryDevice, iVibrationSensor } from '../../interfaces';
import { Battery } from '../sharedFunctions';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability, DeviceType, LogLevel } from '../../enums';
import { PollyService, SonosService } from '../../services';
import { Utils } from '../../utils';
import { Res } from '../../i18n';

export class ZigbeeAquaraVibra extends ZigbeeDevice implements iVibrationSensor, iBatteryDevice {
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);
  /**
   * The sensitivity of the vibration sensor
   */
  public sensitivity: string = '';
  /**
   * The detected tilt angle of the vibration sensor
   */
  public tiltAngle: number = 0;
  /**
   * The detected tilt angle on the x-axis of the vibration sensor
   */
  public tiltAngleX: number = 0;
  /**
   * The detected tilt angle on the x-axis of the vibration sensor
   */
  public tiltAngleXAbs: number = 0;
  /**
   * The detected tilt angle on the y-axis of the vibration sensor
   */
  public tiltAngleY: number = 0;
  /**
   * The detected tilt angle on the y-axis in absolute values of the vibration sensor
   */
  public tiltAngleYAbs: number = 0;
  /**
   * The detected tilt angle on the z-axis of the vibration sensor
   */
  public tiltAngleZ: number = 0;
  /**
   * Whether the vibration sensor is tilted
   */
  public tilt: boolean = false;
  private _vibration: boolean = false;
  private _vibrationBlockedByHandleTimeStamp: number = 0;
  private _vibrationBlockedByMotionTimeStamp: number = 0;
  private _idSensitivity: string = '';
  private _alarmMessage: string;
  private _vibrationBlockedByGriff: boolean = false;
  private _vibrationBlockedByMotion: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAquaraVibra);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
    this.deviceCapabilities.push(DeviceCapability.vibrationSensor);
    this._alarmMessage = Res.vibrationAlarm(this.info.customName);
    PollyService.preloadTTS(this._alarmMessage);
    this._idSensitivity = `${this.info.fullID}.sensitivity`;
  }

  /** @inheritDoc */
  public get vibration(): boolean {
    return this._vibration;
  }

  /** @inheritDoc */
  public get vibrationBlockedByMotionTimeStamp(): number {
    return this._vibrationBlockedByMotionTimeStamp;
  }

  /** @inheritDoc */
  public get vibrationBlockedByHandleTimeStamp(): number {
    return this._vibrationBlockedByHandleTimeStamp;
  }

  // TODO Set Sensitivity

  /** @inheritDoc */
  public get batteryLevel(): number {
    return this.battery.level;
  }

  /** @inheritDoc */
  public get vibrationBlockedByHandle(): boolean {
    return this._vibrationBlockedByGriff;
  }

  /** @inheritDoc */
  public set vibrationBlockedByHandle(pVal: boolean) {
    this.log(LogLevel.Debug, `${pVal ? 'disa' : 'a'}rming vibration alarm for ${this.info.customName} due to handle`);
    if (pVal) {
      this._vibrationBlockedByHandleTimeStamp = new Date().getTime();
    }
    this._vibrationBlockedByGriff = pVal;
  }

  /** @inheritDoc */
  public get vibrationBlockedByMotion(): boolean {
    return this._vibrationBlockedByMotion;
  }

  /** @inheritDoc */
  public set vibrationBlockedByMotion(pVal: boolean) {
    this.log(
      LogLevel.Debug,
      `${pVal ? 'Dea' : 'A'}ktiviere Vibrationsalarm für ${this.info.customName} in Bezug auf Bewegung`,
    );
    if (pVal) {
      this._vibrationBlockedByMotionTimeStamp = Utils.nowMS();
    }
    this._vibrationBlockedByMotion = pVal;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Stecker Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'battery':
        this.battery.level = state.val as number;
        if (this.batteryLevel < 20) {
          this.log(LogLevel.Warn, 'Das Zigbee Gerät hat unter 20% Batterie.');
        }
        break;
      case 'sensitivity':
        this.log(
          initial ? LogLevel.DeepTrace : LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Sensitivity: ${state.val}`,
        );
        this.tiltAngleZ = state.val as number;
        break;
      case 'tilt_angle_z':
        this.log(
          initial ? LogLevel.DeepTrace : LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Winkel Z: ${state.val}`,
        );
        this.tiltAngleZ = state.val as number;
        break;
      case 'tilt_angle_y':
        this.log(
          initial ? LogLevel.DeepTrace : LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Winkel Y: ${state.val}`,
        );
        this.tiltAngleY = state.val as number;
        break;
      case 'tilt_angle_x':
        this.log(
          initial ? LogLevel.DeepTrace : LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Winkel X: ${state.val}`,
        );
        this.tiltAngleX = state.val as number;
        break;
      case 'vibration':
        this.log(
          initial ? LogLevel.DeepTrace : LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Vibration erkannt: ${state.val}`,
        );
        this._vibration = state.val as boolean;
        if (this._vibration) {
          Utils.guardedTimeout(
            () => {
              this.alarmCheck();
            },
            8500,
            this,
          );
        }
        break;
      case 'tilt_angle_y_abs':
        this.log(
          initial ? LogLevel.DeepTrace : LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf absoluten Winkel Y: ${state.val}`,
        );
        this.tiltAngleYAbs = state.val as number;
        break;
      case 'tilt_angle_X_abs':
        this.log(
          initial ? LogLevel.DeepTrace : LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf absoluten Winkel X: ${state.val}`,
        );
        this.tiltAngleXAbs = state.val as number;
        break;
      case 'tilt_angle':
        this.log(
          initial ? LogLevel.DeepTrace : LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Winkel: ${state.val}`,
        );
        this.tiltAngle = state.val as number;
        break;
      case 'tilt':
        this.log(
          initial ? LogLevel.DeepTrace : LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Winkel: ${state.val}`,
        );
        this.tilt = state.val as boolean;
        break;
    }
  }

  public setSensitivity(pVal: number): void {
    let result = 'high';
    switch (pVal) {
      case 0:
        result = 'low';
        break;
      case 1:
        result = 'medium';
        break;
    }
    if (this._idSensitivity === '') {
      this.log(LogLevel.Error, 'Keine Switch ID bekannt.');
      return;
    }

    this.log(LogLevel.Debug, `Vibration Sensitivität schalten Wert: ${result}`);
    this.setState(this._idSensitivity, result, undefined, (err) => {
      console.log(`Stecker schalten ergab Fehler: ${err}`);
    });
  }

  private alarmCheck(): void {
    this.log(
      LogLevel.Debug,
      `Alarmcheck für ${this.info.customName} Alarmblock Wert: ${this._vibrationBlockedByGriff}`,
    );
    if (this._vibrationBlockedByGriff) {
      this.log(LogLevel.Debug, 'Window is open; ignoring vibration alarm.');
      return;
    }
    if (this._vibrationBlockedByMotion) {
      this.log(LogLevel.Debug, `Deaktivierende Bewegung, ignoriere Vibrationsalarm bei ${this.info.customName}`);
      return;
    }

    const message = this._alarmMessage;
    SonosService.speakOnAll(message);
    this.log(LogLevel.Alert, message);
  }
}
