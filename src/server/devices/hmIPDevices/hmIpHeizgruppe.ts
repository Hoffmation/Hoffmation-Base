import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { TemperaturSettings } from '../../../models/temperaturSettings';
import { Devices } from '../devices';
import { Persist } from '../../services/dbo/persist';
import { HmIpHeizung } from './hmIpHeizung';
import { LogLevel } from '../../../models/logLevel';

export class HmIpHeizgruppe extends HmIPDevice {
  private _automaticMode: boolean = true;
  private _iAutomaticInterval: NodeJS.Timeout | undefined;
  private _level: number = 0;
  private _temperatur: number = 0;
  private _humidity: number = 0;
  private _desiredTemperatur: number = 0;
  private _setPointTemperaturID: string = '';
  private _automaticFallBackTemperatur: number = 20;
  private _automaticPoints: { [name: string]: TemperaturSettings } = {};
  private _humidityCallbacks: Array<(pValue: number) => void> = [];

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpHeizgruppe);
    this._setPointTemperaturID = `${this.info.fullID}.1.SET_POINT_TEMPERATURE`;
    this._iAutomaticInterval = Utils.guardedInterval(this.checkAutomaticChange, 300000, this); // Alle 5 Minuten prüfen
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

  public get humidity(): number {
    return this._humidity;
  }

  private set humidity(val: number) {
    this._humidity = val;
    for (const cb of this._humidityCallbacks) {
      cb(val);
    }
  }

  public get desiredTemperatur(): number {
    return this._desiredTemperatur;
  }

  public set desiredTemperatur(val: number) {
    this.setState(
      this._setPointTemperaturID,
      val,
      () => {
        this.log(LogLevel.Info, `Changed temperature of "${this.info.customName}" to "${val}.`);
      },
      (err: Error) => {
        this.log(LogLevel.Error, `Temperaturänderung für "${this.info.customName}" ergab Fehler ${err}.`);
      },
    );
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

  public getBelongingHeizungen(): HmIpHeizung[] {
    const result: HmIpHeizung[] = [];
    for (const dID in Devices.alLDevices) {
      const d = Devices.alLDevices[dID];
      if (d.deviceType === DeviceType.HmIpHeizung && d.info.room === this.info.room) {
        result.push(d as HmIpHeizung);
      }
    }
    return result;
  }

  public setAutomaticPoint(name: string, setting: TemperaturSettings): void {
    this._automaticPoints[name] = setting;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(
      LogLevel.Trace,
      `Heizgruppe "${this.info.customName}" Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
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
        this.log(
          LogLevel.Trace,
          `Heizgruppe "${this.info.customName}" Update Soll-Temperatur JSON: ${JSON.stringify(state)}`,
        );
        this._desiredTemperatur = state.val as number;
        break;
    }
  }

  private checkAutomaticChange(): void {
    if (!this._automaticMode) {
      Persist.addTemperaturDataPoint(this);
      return;
    }

    for (const name in this._automaticPoints) {
      if (this._automaticPoints[name] === undefined) {
        continue;
      }

      const settings: TemperaturSettings = this._automaticPoints[name];
      if (!settings.isNowInRange()) {
        continue;
      }

      if (this._desiredTemperatur !== settings.temperatur) {
        this.log(
          LogLevel.Debug,
          `Automatische Temperaturanpassung für ${this.info.customName} auf ${settings.temperatur}°C`,
        );
        this.desiredTemperatur = settings.temperatur ?? this._automaticFallBackTemperatur;
      }
      break;
    }

    Persist.addTemperaturDataPoint(this);
  }
}
