import { DeviceType } from '../deviceType.js';
import { Res, SonosService, Utils } from '../../services/index.js';
import { ZigbeeDevice } from './BaseDevices/index.js';
import { LogLevel } from '../../../models/index.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';
import { iBatteryDevice } from '../baseDeviceInterfaces/index.js';
import { DeviceCapability } from '../DeviceCapability.js';
import { Battery } from '../sharedFunctions/index.js';

// TODO: Add iWaterSensor
export class ZigbeeAquaraWater extends ZigbeeDevice implements iBatteryDevice {
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);
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
  private _roomName: string = '';

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAquaraWater);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
    this._messageAlarmFirst = Res.waterAlarmStart(this.info.customName, this._roomName);
    this._messageAlarm = Res.waterAlarmRepeat(this.info.customName, this._roomName);
    this._messageAlarmEnd = Res.waterAlarmEnd(this._roomName);
  }

  /** @inheritDoc */
  public get batteryLevel(): number {
    return this.battery.level;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Water Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'battery':
        this.battery.level = state.val as number;
        if (this.batteryLevel < 20) {
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

  /** @inheritDoc */
  public dispose(): void {
    if (this.iAlarmTimeout) {
      clearInterval(this.iAlarmTimeout);
      this.iAlarmTimeout = undefined;
    }
    super.dispose();
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
}
