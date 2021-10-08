import { LogLevel } from '../../../models/logLevel';
import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeDevice } from './zigbeeDevice';
import { ZigbeeDeviceType } from './zigbeeDeviceType';
import { ServerLogService } from '../../services/log-service';
import { SonosService } from '../../services/Sonos/sonos-service';
import { RoomBase } from '../../../models/rooms/RoomBase';
import { Utils } from '../../services/utils/utils';
import { PollyService } from '../../services/Sonos/polly-service';

export class ZigbeeHeimanSmoke extends ZigbeeDevice {
  public smoke: boolean = false;
  private _roomName: string = '';
  public iAlarm: NodeJS.Timeout | undefined = undefined;
  private _messageAlarmFirst: string = '';
  private _messageAlarm: string = '';
  private _messageAlarmEnd: string = '';

  public set roomName(val: string) {
    this._roomName = val;
    this._messageAlarmFirst = `Rauchmelder in ${this._roomName} ausgelöst. Möglicher Brand in ${this._roomName}`;
    this._messageAlarm = `Rauchmelder in ${this._roomName} aktiv. Möglicher Brand in ${this._roomName}`;
    this._messageAlarmEnd = `Rauchmelder Alarm Ende: Gefahr in ${this._roomName} zu Ende.`;
    PollyService.preloadTTS(this._messageAlarmFirst);
    PollyService.preloadTTS(this._messageAlarm);
    PollyService.preloadTTS(this._messageAlarmEnd);
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, ZigbeeDeviceType.ZigbeeHeimanSmoke);
    this._messageAlarmFirst = `Rauchmelder in ${this._roomName} ausgelöst. Möglicher Brand in ${this._roomName}`;
    this._messageAlarm = `Rauchmelder in ${this._roomName} aktiv. Möglicher Brand in ${this._roomName}`;
    this._messageAlarmEnd = `Rauchmelder Alarm Ende: Gefahr in ${this._roomName} zu Ende.`;
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
      RoomBase.setAllRolloOfFloor(-1, 100);
    });
  }
}
