import { ZigbeeDevice } from './BaseDevices';
import { iBatteryDevice, iSmokeDetectorDevice } from '../../interfaces';
import { Battery } from '../sharedFunctions';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { CommandSource, DeviceCapability, DeviceType, LogLevel } from '../../enums';
import { PollyService, Res, RoomService, SonosService } from '../../services';
import { Utils } from '../../utils';
import { FloorSetAllShuttersCommand } from '../../models';

export class ZigbeeHeimanSmoke extends ZigbeeDevice implements iBatteryDevice, iSmokeDetectorDevice {
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);
  /**
   * The timeout for the alarm to fire again
   * @default undefined (no alarm active)
   */
  public iAlarmTimeout: NodeJS.Timeout | undefined = undefined;
  private _smoke: boolean = false;
  private _messageAlarmFirst: string = '';
  private _messageAlarm: string = '';
  private _messageAlarmEnd: string = '';
  private _roomName: string = '';

  /**
   * Creates an instance of {@link DeviceType.ZigbeeHeimanSmoke}.
   * @param pInfo - Device creation information
   */
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeHeimanSmoke);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
    this.deviceCapabilities.push(DeviceCapability.smokeSensor);
    this._messageAlarmFirst = Res.fireAlarmStart(this._roomName, this.info.customName);
    this._messageAlarm = Res.fireAlarmRepeat(this._roomName, this.info.customName);
    this._messageAlarmEnd = Res.fireAlarmEnd(this._roomName);
  }

  /** @inheritDoc */
  public get batteryLevel(): number {
    return this.battery.level;
  }

  /** @inheritDoc */
  public get smoke(): boolean {
    return this._smoke;
  }

  /**
   * The name of the room the device is in (Set during initialization)
   */
  public set roomName(val: string) {
    this._roomName = val;
    this._messageAlarmFirst = Res.fireAlarmStart(this._roomName, this.info.customName);
    this._messageAlarm = Res.fireAlarmRepeat(this._roomName, this.info.customName);
    this._messageAlarmEnd = Res.fireAlarmEnd(this._roomName);
    PollyService.preloadTTS(this._messageAlarmFirst);
    PollyService.preloadTTS(this._messageAlarm);
    PollyService.preloadTTS(this._messageAlarmEnd);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Smoke Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'battery':
        this.battery.level = state.val as number;
        if (this.batteryLevel < 20) {
          this.log(LogLevel.Warn, 'Das Zigbee Gerät hat unter 20% Batterie.');
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
        this._smoke = newVal;
        break;
    }
  }

  /** @inheritDoc */
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

  /** @inheritDoc */
  public dispose(): void {
    if (this.iAlarmTimeout) {
      clearInterval(this.iAlarmTimeout);
      this.iAlarmTimeout = undefined;
    }
    super.dispose();
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
      RoomService.setAllShutterOfFloor(
        new FloorSetAllShuttersCommand(CommandSource.Force, 100, undefined, 'Fire alarm'),
      );
    });
  }
}
