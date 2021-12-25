import { DeviceType } from '../deviceType';
import { ServerLogService } from '../../services/log-service';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { PollyService } from '../../services/Sonos/polly-service';
import { ZigbeeDevice } from './zigbeeDevice';
import { LogLevel } from '../../../models/logLevel';
import { SonosService } from '../../services/Sonos/sonos-service';
import { Res } from '../../services/Translation/res';

export class ZigbeeAquaraWater extends ZigbeeDevice {
  public water: boolean = false;
  private _roomName: string = '';
  public iAlarmTimeout: NodeJS.Timeout | undefined = undefined;
  private _messageAlarmFirst: string = '';
  private _messageAlarm: string = '';
  private _messageAlarmEnd: string = '';

  public set roomName(val: string) {
    this._roomName = val;
    this._messageAlarmFirst = Res.waterAlarmStart(this.info.customName, this._roomName);
    this._messageAlarm = Res.waterAlarmRepeat(this.info.customName, this._roomName);
    this._messageAlarmEnd = Res.waterAlarmEnd(this._roomName);
    PollyService.preloadTTS(this._messageAlarmFirst);
    PollyService.preloadTTS(this._messageAlarm);
    PollyService.preloadTTS(this._messageAlarmEnd);
  }

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAquaraWater);
    this._messageAlarmFirst = Res.waterAlarmStart(this.info.customName, this._roomName);
    this._messageAlarm = Res.waterAlarmRepeat(this.info.customName, this._roomName);
    this._messageAlarmEnd = Res.waterAlarmEnd(this._roomName);
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
    if (this.iAlarmTimeout !== undefined) {
      clearInterval(this.iAlarmTimeout);
    }
    this.iAlarmTimeout = Utils.guardedInterval(
      () => {
        this.alarm();
      },
      15000,
      this,
    );
    this.alarm(true);
  }

  public stopAlarm(quiet: boolean = false): void {
    if (this.iAlarmTimeout) {
      clearInterval(this.iAlarmTimeout);
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
