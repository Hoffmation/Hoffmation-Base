import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';
import { DeviceType } from './deviceType';
import { ServerLogService } from '../services';
import { DeviceInfo } from './DeviceInfo';
import { LogLevel, TimeOfDay } from '../../models';
import { WledSettings } from '../../models/deviceSettings/wledSettings';

export class WledDevice extends IoBrokerBaseDevice {
  public on: boolean = false;
  public brightness: number = -1;
  public linkQuality: number = 0;
  public battery: number = -1;
  public voltage: string = '';
  public settings: WledSettings = new WledSettings();
  private readonly _onID: string;
  private readonly _presetID: string;
  private readonly _brightnessID: string;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.WledDevice);
    this._onID = `${this.info.fullID}.on`;
    this._presetID = `${this.info.fullID}.ps`;
    this._brightnessID = `${this.info.fullID}.bri`;
  }

  public override update(
    idSplit: string[],
    state: ioBroker.State,
    initial: boolean = false,
    _pOverride: boolean = false,
  ): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Wled: ${initial ? 'Initiales ' : ''}Update für "${this.info.customName}": ID: ${idSplit.join(
        '.',
      )} JSON: ${JSON.stringify(state)}`,
    );

    switch (idSplit[3]) {
      case 'on':
        this.on = state.val as boolean;
        break;
      case 'bri':
        this.brightness = state.val as number;
        break;
    }
  }

  public setLight(pValue: boolean, brightness: number = -1, preset?: number): void {
    if (this._onID === '') {
      ServerLogService.writeLog(LogLevel.Error, `Keine On ID für "${this.info.customName}" bekannt.`);
      return;
    }

    if (!this.ioConn) {
      ServerLogService.writeLog(LogLevel.Error, `Keine Connection für "${this.info.customName}" bekannt.`);
      return;
    }

    if (pValue && brightness !== -1 && this.brightness < 10) {
      brightness = 10;
    }

    ServerLogService.writeLog(
      LogLevel.Debug,
      `WLED Schalten: "${this.info.customName}" An: ${pValue}\tHelligkeit: ${brightness}%`,
    );

    this.setState(this._onID, pValue, undefined, (err) => {
      ServerLogService.writeLog(LogLevel.Error, `WLED schalten ergab Fehler: ${err}`);
    });

    if (preset !== undefined) {
      this.setState(this._presetID, preset, undefined, (err) => {
        ServerLogService.writeLog(LogLevel.Error, `WLED schalten ergab Fehler: ${err}`);
      });
    } else if (brightness > -1) {
      this.setState(this._brightnessID, brightness, undefined, (err) => {
        ServerLogService.writeLog(LogLevel.Error, `Dimmer Helligkeit schalten ergab Fehler: ${err}`);
      });
    }
  }

  public setTimeBased(time: TimeOfDay): void {
    switch (time) {
      case TimeOfDay.Night:
        if (this.settings.nightOn) {
          this.setLight(true, this.settings.nightBrightness, this.settings.nightPreset);
        }
        break;
      case TimeOfDay.AfterSunset:
        if (this.settings.duskOn) {
          this.setLight(true, this.settings.duskBrightness, this.settings.duskPreset);
        }
        break;
      case TimeOfDay.BeforeSunrise:
        if (this.settings.dawnOn) {
          this.setLight(true, this.settings.dawnBrightness, this.settings.dawnPreset);
        }
        break;
      case TimeOfDay.Daylight:
        if (this.settings.dayOn) {
          this.setLight(true, this.settings.dayBrightness, this.settings.dayPreset);
        }
        break;
    }
  }
}
