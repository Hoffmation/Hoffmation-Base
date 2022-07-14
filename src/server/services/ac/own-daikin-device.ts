import { ControlInfo, DaikinAC, Mode, Power } from 'daikin-controller';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';
import { SettingsService } from '../settings-service';
import { DaikinService } from './daikin-service';
import { Utils } from '../utils';
import { AcDevice } from './ac-device';

export class OwnDaikinDevice extends AcDevice {
  public desiredState: boolean = Power.OFF;
  public desiredTemp: number = 21;
  public desiredHum: number | 'AUTO' = 'AUTO';
  public desiredMode: number = Mode.COLD;

  public constructor(name: string, roomName: string, ip: string, device: DaikinAC | undefined) {
    super(name, roomName, ip);
    this.energyConsumerSettings.priority = 50;
    this._device = device;
  }

  private _device: DaikinAC | undefined;

  public get device(): DaikinAC | undefined {
    return this._device;
  }

  public set device(device: DaikinAC | undefined) {
    this._device = device;
    if (device && SettingsService.settings.daikin?.activateTracingLogger) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this._device._logger = (data) => {
        ServerLogService.writeLog(LogLevel.Debug, `${this.name}_Logger: ${data}`);
      };
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this._device._daikinRequest.logger = (data) => {
        ServerLogService.writeLog(LogLevel.Debug, `${this.name}_RequestLogger: ${data}`);
      };
    }
  }

  public get on(): boolean {
    return this._device?.currentACControlInfo?.power ?? false;
  }

  public turnOn(): void {
    this.desiredState = Power.ON;
    this.setDesiredInfo();
  }

  public turnOff(): void {
    this._activatedByExcessEnergy = false;
    this.desiredState = Power.OFF;
    this.setDesiredInfo();
  }

  private setDesiredInfo(retry: boolean = false): void {
    const changeObject: Partial<ControlInfo> = {
      power: this.desiredState,
      mode: this.desiredMode,
      targetHumidity: this.desiredHum,
      targetTemperature: this.desiredTemp,
    };
    this.device?.setACControlInfo(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      changeObject,
      (err, res) => {
        if (err !== null) {
          ServerLogService.writeLog(LogLevel.Warn, `Setting Ac Info for ${this.name} failed:  ${err} `);
          if (err.message.includes('EHOSTUNREACH') && !retry) {
            this.log(LogLevel.Warn, `Detected EHOSTUNREACH, will try reconecting`);
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
          return;
        } else if (res) {
          this.log(LogLevel.Info, `Changing Ac ${this.name} Settings was successful`);
          this.logInfo(res);
        } else {
          this.log(LogLevel.Warn, `No Error, but also no response...`);
        }
      },
    );
  }

  private logInfo(info: ControlInfo): void {
    this.log(LogLevel.Debug, `Device Info ${JSON.stringify(info)}`);
  }
}
