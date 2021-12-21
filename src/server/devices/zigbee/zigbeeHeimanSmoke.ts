import { DeviceType } from '../deviceType';
import { ServerLogService } from '../../services/log-service';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { PollyService } from '../../services/Sonos/polly-service';
import { ZigbeeDevice } from './zigbeeDevice';
import { LogLevel } from '../../../models/logLevel';
import { SonosService } from '../../services/Sonos/sonos-service';
import { Res } from '../../services/Translation/res';
import { RoomService } from '../../services/room-service/room-service';

export class ZigbeeHeimanSmoke extends ZigbeeDevice {
  public smoke: boolean = false;
  private _roomName: string = '';
  public iAlarm: NodeJS.Timeout | undefined = undefined;
  private _messageAlarmFirst: string = '';
  private _messageAlarm: string = '';
  private _messageAlarmEnd: string = '';

  public set roomName(val: string) {
    this._roomName = val;
    this._messageAlarmFirst = Res.fireAlarmStart(this._roomName, this.info.customName);
    this._messageAlarm = Res.fireAlarmRepeat(this._roomName, this.info.customName);
    this._messageAlarmEnd = Res.fireAlarmEnd(this._roomName);
    PollyService.preloadTTS(this._messageAlarmFirst);
    PollyService.preloadTTS(this._messageAlarm);
    PollyService.preloadTTS(this._messageAlarmEnd);
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeHeimanSmoke);
    this._messageAlarmFirst = Res.fireAlarmStart(this._roomName, this.info.customName);
    this._messageAlarm = Res.fireAlarmRepeat(this._roomName, this.info.customName);
    this._messageAlarmEnd = Res.fireAlarmEnd(this._roomName);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Smoke Update für "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'smoke':
        ServerLogService.writeLog(LogLevel.Debug, `Smoke Update für ${this.info.customName} auf Rauch: ${state.val}`);
        const newVal: boolean = state.val === true;
        if (this.smoke === true && !newVal) {
          this.stopAlarm();
        } else if (newVal) {
          this.startAlarm();
        }
        this.smoke = newVal;
        break;
    }
  }

  private startAlarm(): void {
    if (this.iAlarm !== undefined) {
      clearInterval(this.iAlarm);
    }
    this.iAlarm = Utils.guardedInterval(
      () => {
        this.alarm();
      },
      15000,
      this,
    );
    this.alarm(true);
  }

  public stopAlarm(quiet: boolean = false): void {
    if (this.iAlarm) {
      clearInterval(this.iAlarm);
    }
    if (quiet) {
      return;
    }
    const message = this._messageAlarmEnd;
    Utils.guardedNewThread(() => {
      ServerLogService.writeLog(LogLevel.Alert, message);
    });
    Utils.guardedNewThread(() => {
      SonosService.speakOnAll(message);
    });
  }

  private alarm(first: boolean = false): void {
    const message = first ? this._messageAlarmFirst : this._messageAlarm;
    Utils.guardedNewThread(() => {
      ServerLogService.writeLog(LogLevel.Alert, message);
    });
    Utils.guardedNewThread(() => {
      SonosService.speakOnAll(message, 100);
    });
    Utils.guardedNewThread(() => {
      // Roll all Rollos up, to ensure free sight for firefighters
      RoomService.setAllRolloOfFloor(-1, 100);
    });
  }
}
