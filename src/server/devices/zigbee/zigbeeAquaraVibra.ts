import { DeviceType } from '../deviceType';
import { PollyService, Res, SonosService, Utils } from '../../services';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models';
import { iVibrationSensor } from '../baseDeviceInterfaces';
import { ZigbeeDevice } from './BaseDevices';

export class ZigbeeAquaraVibra extends ZigbeeDevice implements iVibrationSensor {
  public sensitivity: string = '';
  public tiltAngle: number = 0;
  public tiltAngleX: number = 0;
  public tiltAngleXAbs: number = 0;
  public tiltAngleY: number = 0;
  public tiltAngleYAbs: number = 0;
  public tiltAngleZ: number = 0;
  public tilt: boolean = false;
  public vibration: boolean = false;
  public vibrationBlockedByGriffTimeStamp: number = 0;
  public vibrationBlockedByMotionTimeStamp: number = 0;
  private _idSensitivity: string = '';
  private _alarmMessage: string;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAquaraVibra);
    this._alarmMessage = Res.vibrationAlarm(this.info.customName);
    PollyService.preloadTTS(this._alarmMessage);
    this._idSensitivity = `${this.info.fullID}.sensitivity`;
  }

  // TODO Set Sensitivity

  private _vibrationBlockedByGriff: boolean = false;

  public get vibrationBlockedByGriff(): boolean {
    return this._vibrationBlockedByGriff;
  }

  public set vibrationBlockedByGriff(pVal: boolean) {
    this.log(
      LogLevel.Debug,
      `${pVal ? 'Dea' : 'A'}ktiviere Vibrationsalarm für ${this.info.customName} in Bezug auf den Fenstergriff`,
    );
    if (pVal) {
      this.vibrationBlockedByGriffTimeStamp = new Date().getTime();
    }
    this._vibrationBlockedByGriff = pVal;
  }

  private _vibrationBlockedByMotion: boolean = false;

  public get vibrationBlockedByMotion(): boolean {
    return this._vibrationBlockedByMotion;
  }

  public set vibrationBlockedByMotion(pVal: boolean) {
    this.log(
      LogLevel.Debug,
      `${pVal ? 'Dea' : 'A'}ktiviere Vibrationsalarm für ${this.info.customName} in Bezug auf Bewegung`,
    );
    if (pVal) {
      this.vibrationBlockedByMotionTimeStamp = Utils.nowMS();
    }
    this._vibrationBlockedByMotion = pVal;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Stecker Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
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
        this.vibration = state.val as boolean;
        if (this.vibration) {
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
      this.log(LogLevel.Error, `Keine Switch ID bekannt.`);
      return;
    }

    this.log(LogLevel.Debug, `Vibration Sensitivität schalten Wert: ${result}`);
    this.setState(this._idSensitivity, result, undefined, (err) => {
      console.log(`Stecker schalten ergab Fehler: ${err}`);
    });
  }

  public alarmCheck(): void {
    this.log(
      LogLevel.Debug,
      `Alarmcheck für ${this.info.customName} Alarmblock Wert: ${this._vibrationBlockedByGriff}`,
    );
    if (this._vibrationBlockedByGriff) {
      this.log(LogLevel.Debug, `Fenster offen, ignoriere Vibrationsalarm bei ${this.info.customName}`);
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
