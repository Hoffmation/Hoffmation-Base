import { DeviceType } from '../deviceType';
import { ServerLogService } from '../../services/log-service';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { PollyService } from '../../services/Sonos/polly-service';
import { ZigbeeDevice } from './zigbeeDevice';
import { LogLevel } from '../../../models/logLevel';
import { SonosService } from '../../services/Sonos/sonos-service';

export class ZigbeeAquaraWater extends ZigbeeDevice {
  public water: boolean = false;
  private _roomName: string = '';
  public iAlarm: NodeJS.Timeout | undefined = undefined;
  private _messageAlarmFirst: string = '';
  private _messageAlarm: string = '';
  private _messageAlarmEnd: string = '';

  public set roomName(val: string) {
    this._roomName = val;
    this._messageAlarmFirst = `${this.info.customName} erkennt Wasser. Möglicher Rohrbruch in ${this._roomName}`;
    this._messageAlarm = `${this.info.customName} hat ausgelöst. Poolparty in ${this._roomName}`;
    this._messageAlarmEnd = `Wasser Alarm Ende: Überflutung in ${this._roomName} zu Ende.`;
    PollyService.preloadTTS(this._messageAlarmFirst);
    PollyService.preloadTTS(this._messageAlarm);
    PollyService.preloadTTS(this._messageAlarmEnd);
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAquaraWater);
    this._messageAlarmFirst = `${this.info.customName} erkennt Wasser. Möglicher Rohrbruch in ${this._roomName}`;
    this._messageAlarm = `${this.info.customName} hat ausgelöst. Poolparty in ${this._roomName}`;
    this._messageAlarmEnd = `Wasser Alarm Ende: Überflutung in ${this._roomName} zu Ende.`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Water Update für "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'detected':
        ServerLogService.writeLog(LogLevel.Debug, `Wasser Update für ${this.info.customName} auf Wasser: ${state.val}`);
        const newVal: boolean = state.val === true;
        if (this.water === true && !newVal) {
          this.stopAlarm();
        } else if (newVal) {
          this.startAlarm();
        }
        this.water = newVal;
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
      SonosService.speakOnAll(message, 80);
    });
  }
}
