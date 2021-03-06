import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { TimeCallbackService, Utils } from '../../services';
import { DeviceInfo } from '../DeviceInfo';
import { HeaterSettings, LogLevel, TemperatureSettings, TimeCallback, TimeCallbackType } from '../../../models';
import {
  iHeater,
  iHumiditySensor,
  iTemperatureSensor,
  UNDEFINED_HUMIDITY_VALUE,
  UNDEFINED_TEMP_VALUE,
} from '../baseDeviceInterfaces';
import { DeviceClusterType } from '../device-cluster-type';

export class HmIpHeizgruppe extends HmIPDevice implements iTemperatureSensor, iHumiditySensor, iHeater {
  public settings: HeaterSettings = new HeaterSettings();
  private _iAutomaticInterval: NodeJS.Timeout | undefined;
  private _initialSeasonCheckDone: boolean = false;
  private _level: number = 0;
  private _setPointTemperatureID: string = '';
  private _automaticPoints: { [name: string]: TemperatureSettings } = {};
  private _humidityCallbacks: Array<(pValue: number) => void> = [];
  private _temperatureCallbacks: ((pValue: number) => void)[] = [];

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpHeizgruppe);
    this._setPointTemperatureID = `${this.info.fullID}.1.SET_POINT_TEMPERATURE`;
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
    if (value) {
      this.setState(this._setPointTemperatureID, 5);
    } else {
      this.setState(this._setPointTemperatureID, this.desiredTemperature);
    }
  }

  private _temperature: number = UNDEFINED_TEMP_VALUE;

  public get temperature(): number {
    if (this.settings.useOwnTemperatur) {
      return this._temperature;
    }
    return this._roomTemperatur;
  }

  private set temperature(val: number) {
    this._temperature = val;
    for (const cb of this._temperatureCallbacks) {
      cb(val);
    }
  }

  private _humidity: number = UNDEFINED_HUMIDITY_VALUE;

  public get humidity(): number {
    return this._humidity;
  }

  private set humidity(val: number) {
    this._humidity = val;
    for (const cb of this._humidityCallbacks) {
      cb(val);
    }
  }

  private _desiredTemperature: number = 0;

  public get desiredTemperature(): number {
    return this._desiredTemperature;
  }

  public set desiredTemperature(val: number) {
    this.setState(
      this._setPointTemperatureID,
      this.seasonTurnOff ? 5 : val,
      () => {
        this.log(LogLevel.Info, `Changed temperature of to "${val}.`);
      },
      (err: Error) => {
        this.log(LogLevel.Error, `Temperaturänderung ergab Fehler ${err}.`);
      },
    );
  }

  public get sLevel(): string {
    return `${this._level * 100}%`;
  }

  public get iLevel(): number {
    return this._level;
  }

  public get sTemperature(): string {
    return `${this.temperature}°C`;
  }

  public get iTemperature(): number {
    return this.temperature;
  }

  private _roomTemperatur: number = UNDEFINED_TEMP_VALUE;

  private set roomTemperatur(value: number) {
    this._roomTemperatur = value;
  }

  public addHumidityCallback(pCallback: (pValue: number) => void): void {
    this._humidityCallbacks.push(pCallback);
    if (this._humidity > 0) {
      pCallback(this._humidity);
    }
  }

  public deleteAutomaticPoint(name: string): void {
    if (this._automaticPoints[name] !== undefined) delete this._automaticPoints[name];
  }

  public getBelongingHeizungen(): iHeater[] {
    if (!this.room) {
      return [];
    }
    return this.room.deviceCluster.getDevicesByType(DeviceClusterType.Heater) as iHeater[];
  }

  public setAutomaticPoint(name: string, setting: TemperatureSettings): void {
    this._automaticPoints[name] = setting;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Heizgruppe Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);

    switch (idSplit[3]) {
      case '1':
        this.updateBaseInformation(idSplit[4], state);
        break;
    }
  }

  public stopAutomaticCheck(): void {
    if (this._iAutomaticInterval !== undefined) {
      clearInterval(this._iAutomaticInterval);
      this._iAutomaticInterval = undefined;
    }
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

    if (this._desiredTemperature !== setting.temperature) {
      this.log(
        LogLevel.Debug,
        `Automatische Temperaturanpassung für ${this.info.customName} auf ${setting.temperature}°C`,
      );
      this.desiredTemperature = setting.temperature ?? this.settings.automaticFallBackTemperatur;
    }

    Utils.dbo?.addTemperaturDataPoint(this);
  }

  public addTempChangeCallback(pCallback: (pValue: number) => void): void {
    this._temperatureCallbacks.push(pCallback);
    if (this._temperature > UNDEFINED_TEMP_VALUE) {
      pCallback(this._temperature);
    }
  }

  public onTemperaturChange(newTemperatur: number): void {
    this.roomTemperatur = newTemperatur;
  }

  private updateBaseInformation(name: string, state: ioBroker.State) {
    switch (name) {
      case 'ACTUAL_TEMPERATURE':
        this.temperature = state.val as number;
        break;
      case 'LEVEL':
        this._level = state.val as number;
        break;
      case 'HUMIDITY':
        this.humidity = state.val as number;
        break;
      case 'SET_POINT_TEMPERATURE':
        this.log(LogLevel.DeepTrace, `Heizgruppe Update Soll-Temperatur JSON: ${JSON.stringify(state)}`);
        this._desiredTemperature = state.val as number;
        break;
    }
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
