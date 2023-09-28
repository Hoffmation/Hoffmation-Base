import { ControlInfo, DaikinAC, Mode, Power } from 'daikin-controller';
import { LogDebugType, ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';
import { SettingsService } from '../settings-service';
import { DaikinService } from './daikin-service';
import { Utils } from '../utils';
import { AcDevice } from './ac-device';
import { AcMode } from './ac-mode';
import { AcDeviceType } from './acDeviceType';
import { DeviceType } from '../../devices';

export class OwnDaikinDevice extends AcDevice {
  public desiredState: boolean = Power.OFF;
  public desiredHum: number | 'AUTO' = 'AUTO';
  public desiredMode: number = Mode.COLD;
  public deviceType: DeviceType = DeviceType.Daikin;
  private _on: boolean = false;

  public constructor(name: string, roomName: string, ip: string, device: DaikinAC | undefined) {
    super(name, roomName, ip, AcDeviceType.Daikin);
    this._device = device;
  }

  private _device: DaikinAC | undefined;

  public get device(): DaikinAC | undefined {
    return this._device;
  }

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

  public setDesiredMode(mode: AcMode, writeToDevice: boolean = true): void {
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
      this.setDesiredInfo();
    }
  }

  public turnOn(): void {
    this.log(LogLevel.Info, `Turning on`);
    this.desiredState = Power.ON;
    this.setDesiredInfo();
  }

  public turnOff(): void {
    this.log(LogLevel.Info, `Turning off`);
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

  private setDesiredInfo(retry: boolean = false): void {
    let targetTemp: number = this.room?.HeatGroup?.getTargetTemperature() ?? 21;
    if (this.desiredMode == Mode.HOT) {
      targetTemp = this.settings.useOwnTemperatureAndAutomatic ? targetTemp + 1 : 29;
    } else if (this.desiredMode == Mode.COLD) {
      targetTemp = this.settings.useOwnTemperatureAndAutomatic ? targetTemp - 1 : 16;
    }
    const changeObject: Partial<ControlInfo> = {
      power: this.desiredState,
      mode: this.desiredMode,
      targetHumidity: this.desiredHum,
      targetTemperature: targetTemp,
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
        this.log(LogLevel.Warn, `No Error, but also no response...`);
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

  private handleDeviceUnreach(): void {
    this.log(LogLevel.Warn, `Detected EHOSTUNREACH for ${this.name}(${this.ip}), will try reconecting`);
    DaikinService.reconnect(this.name, this.ip).then((device) => {
      this.device = device;
      Utils.guardedTimeout(
        () => {
          this.setDesiredInfo(true);
        },
        5000,
        this,
      );
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
