import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { Utils } from '../../services';
import { DeviceInfo } from '../DeviceInfo';
import { HeaterSettings, LogLevel, TemperaturSettings } from '../../../models';
import { iTemperaturSensor } from '../iTemperaturSensor';
import { iHumiditySensor } from '../iHumiditySensor';
import { iHeater } from '../iHeater';
import { DeviceClusterType } from '../device-cluster-type';

export class HmIpHeizgruppe extends HmIPDevice implements iTemperaturSensor, iHumiditySensor, iHeater {
  public settings: HeaterSettings = new HeaterSettings();
  private _iAutomaticInterval: NodeJS.Timeout | undefined;
  private _level: number = 0;
  private _temperatur: number = 0;
  private _setPointTemperaturID: string = '';
  private _automaticPoints: { [name: string]: TemperaturSettings } = {};
  private _humidityCallbacks: Array<(pValue: number) => void> = [];

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpHeizgruppe);
    this._setPointTemperaturID = `${this.info.fullID}.1.SET_POINT_TEMPERATURE`;
    this._iAutomaticInterval = Utils.guardedInterval(this.checkAutomaticChange, 300000, this); // Alle 5 Minuten prüfen
  }

  private _humidity: number = 0;

  public get humidity(): number {
    return this._humidity;
  }

  private set humidity(val: number) {
    this._humidity = val;
    for (const cb of this._humidityCallbacks) {
      cb(val);
    }
  }

  private _desiredTemperatur: number = 0;

  public get desiredTemperatur(): number {
    return this._desiredTemperatur;
  }

  public set desiredTemperatur(val: number) {
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

  public get sLevel(): string {
    return `${this._level * 100}%`;
  }

  public get iLevel(): number {
    return this._level;
  }

  public get sTemperatur(): string {
    return `${this._temperatur}°C`;
  }

  public get iTemperatur(): number {
    return this._temperatur;
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

  public setAutomaticPoint(name: string, setting: TemperaturSettings): void {
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
    if (!this.settings.automaticMode) {
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

  private updateBaseInformation(name: string, state: ioBroker.State) {
    switch (name) {
      case 'ACTUAL_TEMPERATURE':
        this._temperatur = state.val as number;
        break;
      case 'LEVEL':
        this._level = state.val as number;
        break;
      case 'HUMIDITY':
        this.humidity = state.val as number;
        break;
      case 'SET_POINT_TEMPERATURE':
        this.log(LogLevel.DeepTrace, `Heizgruppe Update Soll-Temperatur JSON: ${JSON.stringify(state)}`);
        this._desiredTemperatur = state.val as number;
        break;
    }
  }
}
