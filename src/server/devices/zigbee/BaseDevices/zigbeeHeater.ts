import { ZigbeeDevice } from './zigbeeDevice';
import { iHeater, UNDEFINED_TEMP_VALUE } from '../../baseDeviceInterfaces';
import { HeaterSettings, LogLevel, TemperaturSettings, TimeCallback, TimeCallbackType } from '../../../../models';
import { DeviceInfo } from '../../DeviceInfo';
import { DeviceType } from '../../deviceType';
import { TimeCallbackService, Utils } from '../../../services';

export class ZigbeeHeater extends ZigbeeDevice implements iHeater {
  public settings: HeaterSettings = new HeaterSettings();
  protected _automaticPoints: { [name: string]: TemperaturSettings } = {};
  protected _iAutomaticInterval: NodeJS.Timeout | undefined;
  protected _initialSeasonCheckDone: boolean = false;
  protected _level: number = 0;
  protected _setPointTemperaturID: string = '';
  protected _temperatur: number = 0;

  public constructor(pInfo: DeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
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

  protected _desiredTemperatur: number = UNDEFINED_TEMP_VALUE;

  public get desiredTemperatur(): number {
    return this._desiredTemperatur;
  }

  public set desiredTemperatur(val: number) {
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
    return `${this.iTemperatur}°C`;
  }

  public get iTemperatur(): number {
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

    const setting: TemperaturSettings | undefined = TemperaturSettings.getActiveSetting(
      this._automaticPoints,
      new Date(),
    );

    if (setting === undefined) {
      this.log(LogLevel.Warn, `Undefined Heating Timestamp.`);
      this.desiredTemperatur = this.settings.automaticFallBackTemperatur;
      return;
    }

    if (this._desiredTemperatur !== setting.temperatur) {
      this.log(
        LogLevel.Debug,
        `Automatische Temperaturanpassung für ${this.info.customName} auf ${setting.temperatur}°C`,
      );
      this.desiredTemperatur = setting.temperatur ?? this.settings.automaticFallBackTemperatur;
    }

    Utils.dbo?.addTemperaturDataPoint(this);
  }

  public deleteAutomaticPoint(name: string): void {
    if (this._automaticPoints[name] !== undefined) delete this._automaticPoints[name];
  }

  public setAutomaticPoint(name: string, setting: TemperaturSettings): void {
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
