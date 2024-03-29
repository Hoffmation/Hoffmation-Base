import { DeviceType } from '../deviceType';
import { Res, SonosService, Utils } from '../../services';
import { ZigbeeDevice } from './BaseDevices';
import { LogLevel } from '../../../models';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { iBatteryDevice } from '../baseDeviceInterfaces';
import { DeviceCapability } from '../DeviceCapability';

// TODO: Add iWaterSensor
export class ZigbeeAquaraWater extends ZigbeeDevice implements iBatteryDevice {
  private _battery: number = -99;
  private _lastBatteryPersist: number = 0;
  /** @inheritDoc */
  public get lastBatteryPersist(): number {
    return this._lastBatteryPersist;
  }

  /** @inheritDoc */
  public get battery(): number {
    return this._battery;
  }

  /**
   * Whether water is detected
   */
  public water: boolean = false;
  /**
   * The timeout for the alarm
   * @default undefined (no alarm active)
   */
  public iAlarmTimeout: NodeJS.Timeout | undefined = undefined;
  private _messageAlarmFirst: string = '';
  private _messageAlarm: string = '';
  private _messageAlarmEnd: string = '';
  private _supressAlarmTimeStamp: number = 0;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAquaraWater);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
    this._messageAlarmFirst = Res.waterAlarmStart(this.info.customName, this._roomName);
    this._messageAlarm = Res.waterAlarmRepeat(this.info.customName, this._roomName);
    this._messageAlarmEnd = Res.waterAlarmEnd(this._roomName);
  }

  private _roomName: string = '';

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Water Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'battery':
        this._battery = state.val as number;
        this.persistBatteryDevice();
        if (this._battery < 20) {
          this.log(LogLevel.Warn, 'Das Zigbee Gerät hat unter 20% Batterie.');
        }
        break;
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

  public stopAlarm(quiet: boolean = false, timeout: number = -1): void {
    if (this.iAlarmTimeout) {
      clearInterval(this.iAlarmTimeout);
    }
    if (timeout > -1 && this.water) {
      this._supressAlarmTimeStamp = Utils.nowMS() + timeout;
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
    if (Utils.nowMS() < this._supressAlarmTimeStamp) {
      this.log(LogLevel.Warn, 'Would start alarm, but we are supressed.');
      return;
    }
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

  /** @inheritDoc */
  public persistBatteryDevice(): void {
    const now: number = Utils.nowMS();
    if (this._lastBatteryPersist + 60000 > now) {
      return;
    }
    Utils.dbo?.persistBatteryDevice(this);
    this._lastBatteryPersist = now;
  }

  /** @inheritDoc */
  public dispose(): void {
    if (this.iAlarmTimeout) {
      clearInterval(this.iAlarmTimeout);
      this.iAlarmTimeout = undefined;
    }
    super.dispose();
  }
}
