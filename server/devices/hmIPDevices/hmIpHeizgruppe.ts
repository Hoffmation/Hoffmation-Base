import { HmIPDevice } from './hmIpDevice';
import { HmIpDeviceType } from './hmIpDeviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '/models/logLevel';
import { ServerLogService } from '/server/services/log-service';
import { TemperaturSettings } from '/models/temperaturSettings';
import { Persist } from '/server/services/dbo/persist';
import { HmIpHeizung } from './hmIpHeizung';
import { Devices } from '../devices';
import { Utils } from '/server/services/utils/utils';

export class HmIpHeizgruppe extends HmIPDevice {
  private _automaticMode: boolean = true;
  private _iAutomaticInterval: NodeJS.Timeout;
  private _level: number = 0;
  private _temperatur: number = 0;
  private _humidity: number = 0;
  private _desiredTemperatur: number = 0;
  private _setPointTemperaturID: string = '';
  private _automaticFallBackTemperatur: number = 20;
  private _automaticPoints: { [name: string]: TemperaturSettings } = {};
  private _humidityCallbacks: Array<(pValue: number) => void> = [];

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, HmIpDeviceType.HmIpHeizgruppe);
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

  public get desiredTemperatur(): number {
    return this._desiredTemperatur;
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

  public set desiredTemperatur(val: number) {
    if (!this.ioConn) {
      ServerLogService.writeLog(LogLevel.Error, `Keine Connection für "${this.info.customName}" bekannt.`);
      return;
    }

    ServerLogService.writeLog(LogLevel.Info, `Neue Temperatur (${val}) für "${this.info.customName}".`);
    this.ioConn.setState(this._setPointTemperaturID, val, (err) => {
      if (err) {
        ServerLogService.writeLog(
          LogLevel.Error,
          `Temperaturänderung für "${this.info.customName}" ergab Fehler ${err}.`,
        );
      } else {
        ServerLogService.writeLog(
          LogLevel.Debug,
          `Temperaturänderung für "${this.info.customName}" auf ${val} erfolgreich`,
        );
      }
    });
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
    for (const dID in Devices.hmIP) {
      const d = Devices.hmIP[dID];
      if (d.deviceType === HmIpDeviceType.HmIpHeizung && d.info.room === this.info.room) {
        result.push(d as HmIpHeizung);
      }
    }
    return result;
  }

  public setAutomaticPoint(name: string, setting: TemperaturSettings): void {
    this._automaticPoints[name] = setting;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.Trace,
      `Heizgruppe "${this.info.customName}" Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);

    switch (idSplit[3]) {
      case '1':
        this.updateBaseInformation(idSplit[4], state, initial);
        break;
    }
  }

  private updateBaseInformation(name: string, state: ioBroker.State, initial: boolean) {
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
        ServerLogService.writeLog(
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
        ServerLogService.writeLog(
          LogLevel.Debug,
          `Automatische Temperaturanpassung für ${this.info.customName} auf ${settings.temperatur}°C`,
        );
        this.desiredTemperatur = settings.temperatur;
      }
      break;
    }

    Persist.addTemperaturDataPoint(this);
  }
}
