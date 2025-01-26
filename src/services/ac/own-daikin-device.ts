import { AcDevice } from './ac-device';
import { ControlInfo, DaikinAC, Mode, Power } from 'daikin-controller';
import { AcDeviceType, AcMode, DeviceType, LogDebugType, LogLevel } from '../../enums';
import { UNDEFINED_TEMP_VALUE } from '../../interfaces';
import { SettingsService } from '../../settings-service';
import { ServerLogService } from '../../logging';
import { DaikinService } from './daikin-service';
import { Utils } from '../../utils';

export class OwnDaikinDevice extends AcDevice {
  /**
   * The desired state of the device
   */
  public desiredState: boolean = Power.OFF;
  /**
   * The desired humidity-state of the device
   * @default 'AUTO'
   */
  public desiredHum: number | 'AUTO' = 'AUTO';
  /**
   * The desired mode of the device
   * @default Mode.COLD
   */
  public desiredMode: number = Mode.COLD;
  /** @inheritDoc */
  public deviceType: DeviceType = DeviceType.Daikin;
  private _on: boolean = false;

  public constructor(
    name: string,
    roomName: string,
    ip: string,
    private _device: DaikinAC | undefined,
    private _mac: string | undefined = undefined,
  ) {
    super(name, roomName, ip, AcDeviceType.Daikin, DeviceType.Daikin);
    this.jsonOmitKeys.push('_device');
  }

  public get device(): DaikinAC | undefined {
    return this._device;
  }

  /** @inheritDoc */
  public get on(): boolean {
    return this._on;
  }

  public set device(device: DaikinAC | undefined) {
    this._device = device;
    if (device && SettingsService.settings.daikin?.activateTracingLogger) {
      device.logger = (data) => {
        ServerLogService.writeLog(LogLevel.Debug, `${this.name}_Logger: ${data}`);
      };
      device.setRequestLogger((data) => {
        ServerLogService.writeLog(LogLevel.Debug, `${this.name}_RequestLogger: ${data}`);
      });
    }
    void this.updateInfo();
  }

  /** @inheritDoc */
  public setDesiredMode(mode: AcMode, writeToDevice: boolean = true, desiredTemp?: number): void {
    let newMode: number = -1;
    switch (mode) {
      case AcMode.Heating:
        newMode = Mode.HOT;
        break;
      case AcMode.Cooling:
        newMode = Mode.COLD;
        break;
      case AcMode.Auto:
        newMode = Mode.AUTO;
        break;
    }
    if (newMode === -1 || newMode === this.desiredMode) {
      return;
    }
    this.desiredMode = newMode;
    this._mode = mode;
    if (writeToDevice) {
      this.setDesiredInfo(false, desiredTemp);
    }
  }

  /** @inheritDoc */
  public turnOn(): void {
    this.log(LogLevel.Info, 'Turning on');
    this.desiredState = Power.ON;
    this.setDesiredInfo();
  }

  /** @inheritDoc */
  public turnOff(): void {
    this.log(LogLevel.Info, 'Turning off');
    this._activatedByExcessEnergy = false;
    this.desiredState = Power.OFF;
    this._mode = AcMode.Off;
    this.setDesiredInfo();
  }

  protected automaticCheck(): void {
    // First Load Device Info, then perform check
    this.updateInfo().then((_on) => {
      super.automaticCheck();
    });
  }

  private setDesiredInfo(retry: boolean = false, forceTemp?: number): void {
    if (this._desiredTemperatur === UNDEFINED_TEMP_VALUE) {
      if (this.room?.HeatGroup === undefined) {
        this.log(LogLevel.Error, `Neither desired temperature nor HeatGroup is set for ${this.name}(${this.ip})`);
        return;
      }
      this._desiredTemperatur = this.room.HeatGroup.desiredTemp;
      return;
    }
    let targetTemp: number = this._desiredTemperatur;
    if (this.desiredMode == Mode.HOT) {
      targetTemp = this.settings.useOwnTemperature ? targetTemp : 29;
    } else if (this.desiredMode == Mode.COLD) {
      targetTemp = this.settings.useOwnTemperature ? targetTemp : 16;
    }
    const changeObject: Partial<ControlInfo> = {
      power: this.desiredState,
      mode: this.desiredMode,
      targetHumidity: this.desiredHum,
      targetTemperature: forceTemp ?? targetTemp,
    };
    this.device?.setACControlInfo(changeObject, (err, res) => {
      if (err !== null) {
        ServerLogService.writeLog(LogLevel.Warn, `Setting Ac Info for ${this.name} failed:  ${err} `);
        if (err.message.includes('EHOSTUNREACH') && !retry) {
          this.handleDeviceUnreach();
          return;
        } else if (err.message.includes('ret=PARAM NG') && !retry) {
          this.handleParamNg(changeObject);
          return;
        }
      } else if (res) {
        this.log(LogLevel.Info, `Changing Ac ${this.name} Settings was successful`);
        this.log(LogLevel.Debug, `Device Info ${JSON.stringify(res)}`, LogDebugType.DaikinSuccessfullControlInfo);
        this._on = res.power ?? this.desiredState;
        this.persist();
      } else {
        this.log(LogLevel.Warn, 'No Error, but also no response...');
      }
    });
  }

  private updateInfo(): Promise<boolean> {
    return new Promise<boolean>((res) => {
      this.device?.getACControlInfo((_err, response) => {
        if (response) {
          this.log(LogLevel.Trace, `Getting Ac ${this.name} info was successful`);
          this._on = response.power ?? this.desiredState;
        }
        res(this._on);
      });
    });
  }

  /**
   * Handles the situation when the device is unreachable, attempts to reconnect and log the outcome.
   *
   * This function logs a warning message indicating that the device is unreachable,
   * then attempts to reconnect using the `DaikinService.reconnect` method.
   * If the reconnection is successful, it sets the desired information and schedules a timeout of 5000ms.
   * If the reconnection fails, it logs an error message with the reason for the failure.
   */
  private handleDeviceUnreach(): void {
    this.log(LogLevel.Warn, `Detected EHOSTUNREACH for ${this.name}(${this.ip}), will try reconecting`);
    DaikinService.reconnect(this.name, this.ip, this._mac)
      .then((device) => {
        this.device = device;
        Utils.guardedTimeout(
          () => {
            this.setDesiredInfo(true);
          },
          5000,
          this,
        );
      })
      .catch((err) => {
        this.log(LogLevel.Error, `Reconnecting failed for ${this.name}(${this.ip}): ${err}`);
      });
  }

  private handleParamNg(changeObject: Partial<ControlInfo>): void {
    this.log(
      LogLevel.Error,
      `Detected Param Ng for ${this.name}(${this.ip}), will try reloading Control Info. Change Object: ${JSON.stringify(
        changeObject,
      )}`,
    );
    this._device?.getACControlInfo((err: Error | null) => {
      if (err === null) {
        this.log(
          LogLevel.Warn,
          `Device Info loaded successfull will try setting Control Info again: ${JSON.stringify(
            this._device?.currentACControlInfo,
          )}`,
        );
        this.setDesiredInfo(true);
      }
    });
  }
}
