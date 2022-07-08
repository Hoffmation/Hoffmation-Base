import { ControlInfo, DaikinAC, Mode, Power } from 'daikin-controller';
import { ServerLogService } from '../log-service';
import { LogLevel } from '../../../models';

export class OwnDaikinDevice {
  public desiredState: boolean = Power.OFF;
  public desiredTemp: number = 21;
  public desiredHum: number | 'AUTO' = 'AUTO';
  public desiredMode: number = Mode.COLD;

  public constructor(
    public name: string,
    public roomName: string,
    public ip: string,
    public device: DaikinAC | undefined,
  ) {}

  public turnOn(): void {
    this.desiredState = Power.ON;
    this.setDesiredInfo();
  }

  public turnOff(): void {
    this.desiredState = Power.OFF;
    this.setDesiredInfo();
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
    ServerLogService.writeLog(LogLevel.Debug, `Device Info for "${this.name}": ${JSON.stringify(info)}`);
  }
}
