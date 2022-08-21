import { ZigbeeDevice } from './zigbeeDevice';
import { iBatteryDevice, iHeater, UNDEFINED_TEMP_VALUE } from '../../baseDeviceInterfaces';
import { HeaterSettings, LogLevel, TemperatureSettings, TimeCallback, TimeCallbackType } from '../../../../models';
import { DeviceType } from '../../deviceType';
import { TimeCallbackService, Utils } from '../../../services';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { DeviceCapability } from '../../DeviceCapability';
import { PIDController } from '../../../../liquid-pid';

export class ZigbeeHeater extends ZigbeeDevice implements iHeater, iBatteryDevice {
  public settings: HeaterSettings = new HeaterSettings();
  public battery: number = -99;
  protected _automaticPoints: { [name: string]: TemperatureSettings } = {};
  protected _iAutomaticInterval: NodeJS.Timeout | undefined;
  protected _initialSeasonCheckDone: boolean = false;
  protected _level: number = 0;
  protected _setPointTemperaturID: string = '';
  protected _temperatur: number = 0;
  protected _desiredTemperatur: number = UNDEFINED_TEMP_VALUE;
  protected _pidController: PIDController = new PIDController({
    temp: {
      ref: 20, // Point temperature
    },
    Pmax: 100, // Max power (output),

    // Tune the PID Controller
    Kp: 25, // PID: Kp in 1/1000
    Ki: 1000, // PID: Ki in 1/1000
    Kd: 9, // PID: Kd in 1/1000
  });

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
    this.deviceCapabilities.push(DeviceCapability.heater);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
    this._iAutomaticInterval = Utils.guardedInterval(this.checkAutomaticChange, 300000, this); // Alle 5 Minuten prüfen
    TimeCallbackService.addCallback(
      new TimeCallback(
        `${this.info.fullID} Season Check`,
        TimeCallbackType.TimeOfDay,
        () => {
          this.checkSeasonTurnOff();
        },
        0,
        2,
        0,
      ),
    );
  }

  protected _seasonTurnOff: boolean = false;

  public get seasonTurnOff(): boolean {
    return this._seasonTurnOff;
  }

  public set seasonTurnOff(value: boolean) {
    this._seasonTurnOff = value;
  }

  public get desiredTemperature(): number {
    return this._desiredTemperatur;
  }

  public set desiredTemperature(val: number) {
    this._desiredTemperatur = val;
    this.setState(
      this._setPointTemperaturID,
      val,
      () => {
        this.log(LogLevel.Info, `Changed temperature of to "${val}.`);
      },
      (err: Error) => {
        this.log(LogLevel.Error, `Temperaturänderung ergab Fehler ${err}.`);
      },
    );
  }

  protected _humidity: number = 0;

  public get humidity(): number {
    return this._humidity;
  }

  public get sLevel(): string {
    return `${this._level * 100}%`;
  }

  public get iLevel(): number {
    return this._level;
  }

  public get sTemperatur(): string {
    return `${this.iTemperature}°C`;
  }

  public get iTemperature(): number {
    if (this.settings.useOwnTemperatur) {
      return this._temperatur;
    } else {
      return this._roomTemperatur;
    }
  }

  protected _roomTemperatur: number = 0;

  protected set roomTemperatur(val: number) {
    this._roomTemperatur = val;
  }

  public checkAutomaticChange(): void {
    if (!this._initialSeasonCheckDone) {
      this.checkSeasonTurnOff();
    }
    if (!this.settings.automaticMode || this.seasonTurnOff) {
      Utils.dbo?.addTemperaturDataPoint(this);
      return;
    }

    const setting: TemperatureSettings | undefined = TemperatureSettings.getActiveSetting(
      this._automaticPoints,
      new Date(),
    );

    if (setting === undefined) {
      this.log(LogLevel.Warn, `Undefined Heating Timestamp.`);
      this.desiredTemperature = this.settings.automaticFallBackTemperatur;
      return;
    }

    if (this._desiredTemperatur !== setting.temperature) {
      this.log(
        LogLevel.Debug,
        `Automatische Temperaturanpassung für ${this.info.customName} auf ${setting.temperature}°C`,
      );
      this.desiredTemperature = setting.temperature;
    }

    Utils.dbo?.addTemperaturDataPoint(this);
  }

  public deleteAutomaticPoint(name: string): void {
    if (this._automaticPoints[name] !== undefined) delete this._automaticPoints[name];
  }

  public setAutomaticPoint(name: string, setting: TemperatureSettings): void {
    this._automaticPoints[name] = setting;
  }

  public stopAutomaticCheck(): void {
    if (this._iAutomaticInterval !== undefined) {
      clearInterval(this._iAutomaticInterval);
      this._iAutomaticInterval = undefined;
    }
  }

  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperatur = newTemperatur;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    switch (idSplit[3]) {
      case 'battery':
        this.battery = state.val as number;
        if (this.battery < 20) {
          this.log(LogLevel.Warn, `Das Zigbee Gerät hat unter 20% Batterie.`);
        }
        break;
    }
    super.update(idSplit, state, initial, pOverride);
  }

  protected getNextPidLevel(): number {
    if (this.seasonTurnOff) {
      return 0;
    }
    this._pidController.setPoint(this.desiredTemperature);
    const newValue: number = this._pidController.calculate(this._roomTemperatur);
    this.log(
      LogLevel.Debug,
      `New PID Value ${newValue}% (cTemp: ${this._roomTemperatur}, dTemp: ${this.desiredTemperature})`,
    );
    return newValue;
  }

  private checkSeasonTurnOff(): void {
    const desiredState: boolean = Utils.beetweenDays(
      new Date(),
      this.settings.seasonTurnOffDay,
      this.settings.seasonTurnOnDay,
    );
    if (desiredState !== this.seasonTurnOff || !this._initialSeasonCheckDone) {
      this.log(LogLevel.Info, `Switching Seasonal Heating --> New seasonTurnOff: ${desiredState}`);
      this.seasonTurnOff = desiredState;
    }
    this._initialSeasonCheckDone = true;
  }
}
