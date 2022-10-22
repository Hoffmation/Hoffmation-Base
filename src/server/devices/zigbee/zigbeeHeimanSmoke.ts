import { DeviceType } from '../deviceType';
import { PollyService, Res, RoomService, SonosService, Utils } from '../../services';
import { ZigbeeDevice } from './BaseDevices';
import { LogLevel } from '../../../models';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { iBatteryDevice } from '../baseDeviceInterfaces';
import { DeviceCapability } from '../DeviceCapability';

export class ZigbeeHeimanSmoke extends ZigbeeDevice implements iBatteryDevice {
  private _battery: number = -99;

  public get battery(): number {
    return this._battery;
  }

  public smoke: boolean = false;
  public iAlarmTimeout: NodeJS.Timeout | undefined = undefined;
  private _messageAlarmFirst: string = '';
  private _messageAlarm: string = '';
  private _messageAlarmEnd: string = '';

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeHeimanSmoke);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
    this._messageAlarmFirst = Res.fireAlarmStart(this._roomName, this.info.customName);
    this._messageAlarm = Res.fireAlarmRepeat(this._roomName, this.info.customName);
    this._messageAlarmEnd = Res.fireAlarmEnd(this._roomName);
  }

  private _roomName: string = '';

  public set roomName(val: string) {
    this._roomName = val;
    this._messageAlarmFirst = Res.fireAlarmStart(this._roomName, this.info.customName);
    this._messageAlarm = Res.fireAlarmRepeat(this._roomName, this.info.customName);
    this._messageAlarmEnd = Res.fireAlarmEnd(this._roomName);
    PollyService.preloadTTS(this._messageAlarmFirst);
    PollyService.preloadTTS(this._messageAlarm);
    PollyService.preloadTTS(this._messageAlarmEnd);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Smoke Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'battery':
        this._battery = state.val as number;
        this.persistBatteryDevice();
        if (this._battery < 20) {
          this.log(LogLevel.Warn, `Das Zigbee Gerät hat unter 20% Batterie.`);
        }
        break;
      case 'smoke':
        this.log(LogLevel.Debug, `Smoke Update für ${this.info.customName} auf Rauch: ${state.val}`);
        const newVal: boolean = state.val === true;
        if (this.smoke && !newVal) {
          this.stopAlarm();
        } else if (newVal) {
          this.startAlarm();
        }
        this.smoke = newVal;
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
      SonosService.speakOnAll(message, 100);
    });
    Utils.guardedNewThread(() => {
      // Roll all Rollos up, to ensure free sight for firefighters
      RoomService.setAllRolloOfFloor(-1, 100);
    });
  }

  public persistBatteryDevice(): void {
    Utils.dbo?.persistBatteryDevice(this);
  }

  public dispose(): void {
    if (this.iAlarmTimeout) {
      clearInterval(this.iAlarmTimeout);
      this.iAlarmTimeout = undefined;
    }
    super.dispose();
  }
}
