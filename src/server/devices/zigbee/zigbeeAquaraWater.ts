import { DeviceType } from '../deviceType';
import { PollyService, Res, SonosService, Utils } from '../../services';
import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeDevice } from './BaseDevices';
import { LogLevel } from '../../../models';

export class ZigbeeAquaraWater extends ZigbeeDevice {
  public water: boolean = false;
  public iAlarmTimeout: NodeJS.Timeout | undefined = undefined;
  private _messageAlarmFirst: string = '';
  private _messageAlarm: string = '';
  private _messageAlarmEnd: string = '';

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAquaraWater);
    this._messageAlarmFirst = Res.waterAlarmStart(this.info.customName, this._roomName);
    this._messageAlarm = Res.waterAlarmRepeat(this.info.customName, this._roomName);
    this._messageAlarmEnd = Res.waterAlarmEnd(this._roomName);
  }

  private _roomName: string = '';

  public set roomName(val: string) {
    this._roomName = val;
    this._messageAlarmFirst = Res.waterAlarmStart(this.info.customName, this._roomName);
    this._messageAlarm = Res.waterAlarmRepeat(this.info.customName, this._roomName);
    this._messageAlarmEnd = Res.waterAlarmEnd(this._roomName);
    PollyService.preloadTTS(this._messageAlarmFirst);
    PollyService.preloadTTS(this._messageAlarm);
    PollyService.preloadTTS(this._messageAlarmEnd);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Water Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'detected':
        this.log(LogLevel.Debug, `Wasser Update für ${this.info.customName} auf Wasser: ${state.val}`);
        const newVal: boolean = state.val === true;
        if (this.water && !newVal) {
          this.stopAlarm();
        } else if (newVal) {
          this.startAlarm();
        }
        this.water = newVal;
        break;
    }
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
      this.log(LogLevel.Alert, message);
    });
    Utils.guardedNewThread(() => {
      SonosService.speakOnAll(message);
    });
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

  private alarm(first: boolean = false): void {
    const message = first ? this._messageAlarmFirst : this._messageAlarm;
    Utils.guardedNewThread(() => {
      this.log(LogLevel.Alert, message);
    });
    Utils.guardedNewThread(() => {
      SonosService.speakOnAll(message, 80);
    });
  }
}
