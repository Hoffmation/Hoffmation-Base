import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeDevice } from './zigbeeDevice';
import { ZigbeeDeviceType } from './zigbeeDeviceType';
import { LogLevel } from '/models/logLevel';
import { ServerLogService } from '/server/services/log-service';
import { SonosService } from '/server/services/Sonos/sonos-service';
import { Utils } from '/server/services/utils/utils';
import { PollyService } from '/server/services/Sonos/polly-service';

export class ZigbeeAquaraVibra extends ZigbeeDevice {
  public sensitivity: string = '';
  public tiltAngle: number = 0;
  public tiltAngleX: number = 0;
  public tiltAngleXAbs: number = 0;
  public tiltAngleY: number = 0;
  public tiltAngleYAbs: number = 0;
  public tiltAngleZ: number = 0;
  public tilt: boolean = false;
  public vibration: boolean = false;
  public vibrationBlockedTimeStamp: number = 0;
  private _idSensitivity: string = '';
  private _vibrationBlocked: boolean = false;
  private _alarmMessage: string;
  // TODO Set Sensitivity

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, ZigbeeDeviceType.ZigbeeAquaraVibra);
    this._alarmMessage = `Alarm bei ${this.info.customName}. Ich wiederhole: Alarm bei ${this.info.customName}`;
    PollyService.preloadTTS(this._alarmMessage);
    this._idSensitivity = `${this.info.fullID}.sensitivity`;
  }

  public set vibrationBlocked(pVal: boolean) {
    ServerLogService.writeLog(
      LogLevel.Debug,
      `${pVal ? 'Dea' : 'A'}ktiviere Vibrationsalarm für ${this.info.customName}`,
    );
    if (pVal) {
      this.vibrationBlockedTimeStamp = new Date().getTime();
    }
    this._vibrationBlocked = pVal;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Stecker Update für "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'sensitivity':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Sensitivity: ${state.val}`,
        );
        this.tiltAngleZ = state.val as number;
        break;
      case 'tilt_angle_z':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Winkel Z: ${state.val}`,
        );
        this.tiltAngleZ = state.val as number;
        break;
      case 'tilt_angle_y':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Winkel Y: ${state.val}`,
        );
        this.tiltAngleY = state.val as number;
        break;
      case 'tilt_angle_x':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Winkel X: ${state.val}`,
        );
        this.tiltAngleX = state.val as number;
        break;
      case 'vibration':
        ServerLogService.writeLog(
          LogLevel.Trace,
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
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf absoluten Winkel Y: ${state.val}`,
        );
        this.tiltAngleYAbs = state.val as number;
        break;
      case 'tilt_angle_X_abs':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf absoluten Winkel X: ${state.val}`,
        );
        this.tiltAngleXAbs = state.val as number;
        break;
      case 'tilt_angle':
        ServerLogService.writeLog(
          LogLevel.Trace,
          `Vibrationssensor Update für ${this.info.customName} auf Winkel: ${state.val}`,
        );
        this.tiltAngle = state.val as number;
        break;
      case 'tilt':
        ServerLogService.writeLog(
          LogLevel.Trace,
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
      ServerLogService.writeLog(LogLevel.Error, `Keine Switch ID für "${this.info.customName}" bekannt.`);
      return;
    }

    if (!this.ioConn) {
      ServerLogService.writeLog(LogLevel.Error, `Keine Connection für "${this.info.customName}" bekannt.`);
      return;
    }

    ServerLogService.writeLog(
      LogLevel.Debug,
      `Vibration Sensitivität schalten: "${this.info.customName}" Wert: ${result}`,
    );
    this.ioConn.setState(this._idSensitivity, result, (err) => {
      if (err) {
        console.log(`Stecker schalten ergab Fehler: ${err}`);
      }
    });
  }

  private alarmCheck(): void {
    ServerLogService.writeLog(
      LogLevel.Debug,
      `Alarmcheck für ${this.info.customName} Alarmblock Wert: ${this._vibrationBlocked}`,
    );
    if (this._vibrationBlocked) {
      ServerLogService.writeLog(LogLevel.Debug, `Fenster offen, ignoriere Vibrationsalarm bei ${this.info.customName}`);
      return;
    }

    const message = this._alarmMessage;
    SonosService.speakOnAll(message);
    ServerLogService.writeLog(LogLevel.Alert, message);
  }
}
