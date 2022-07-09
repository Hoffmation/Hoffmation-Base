import { ControlInfo, DaikinAC, Mode, Power } from 'daikin-controller';
import { ServerLogService } from '../log-service';
import { ExcessEnergyConsumerSettings, LogLevel } from '../../../models';
import { SettingsService } from '../settings-service';
import { iExcessEnergyConsumer } from '../../devices';

export class OwnDaikinDevice implements iExcessEnergyConsumer {
  public currentConsumption: number = -1;
  public desiredState: boolean = Power.OFF;
  public desiredTemp: number = 21;
  public desiredHum: number | 'AUTO' = 'AUTO';
  public desiredMode: number = Mode.COLD;
  public energyConsumerSettings: ExcessEnergyConsumerSettings = new ExcessEnergyConsumerSettings();

  public constructor(
    public name: string,
    public roomName: string,
    public ip: string,
    private _device: DaikinAC | undefined,
  ) {
    this.energyConsumerSettings.priority = 50;
  }

  public get on(): boolean {
    return this._device?.currentACControlInfo?.power ?? false;
  }

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

  public turnOn(): void {
    this.desiredState = Power.ON;
    this.setDesiredInfo();
  }

  public turnOff(): void {
    this.desiredState = Power.OFF;
    this.setDesiredInfo();
  }

  public log(level: LogLevel, message: string): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`);
  }

  private setDesiredInfo(): void {
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
        if (!res) {
          ServerLogService.writeLog(LogLevel.Warn, `Setting Ac Info for ${this.name} failed:  ${err} `);
          return;
        }
        ServerLogService.writeLog(LogLevel.Info, `Changing Ac ${this.name} Settings was successful`);
        this.logInfo(res);
      },
    );
  }

  private logInfo(info: ControlInfo): void {
    this.log(LogLevel.Debug, `Device Info ${JSON.stringify(info)}`);
  }
}
