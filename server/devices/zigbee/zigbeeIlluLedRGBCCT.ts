import { DeviceInfo } from '../DeviceInfo';
import { ZigbeeDevice } from './zigbeeDevice';
import { ZigbeeDeviceType } from './zigbeeDeviceType';
import { LedSettings } from '/models/ledSettings';
import { LogLevel } from '/models/logLevel';
import { ServerLogService } from '/server/services/log-service';
import { TimeOfDay } from '/server/services/time-callback-service';

export class ZigbeeIlluLedRGBCCT extends ZigbeeDevice {
  public static DEFAULT_COLOR_WARM: string = '#f2b200';
  public on: boolean = false;
  public brightness: number = 0;
  public color: string = '#fcba32';
  public colortemp: number = 500;
  public settings: LedSettings = new LedSettings();
  private stateID: string = 'state';
  private brightnessID: string = 'brightness';
  private colorID: string = '';
  private colorTempID: string = '';
  private effectID: string = '';

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, ZigbeeDeviceType.ZigbeeIlluLedRGBCCT);
    this.stateID = `${this.info.fullID}.state`;
    this.brightnessID = `${this.info.fullID}.brightness`;
    this.colorID = `${this.info.fullID}.color`;
    this.colorTempID = `${this.info.fullID}.colortemp`;
    this.effectID = `${this.info.fullID}.effect`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `LED Update für "${this.info.customName}": ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        ServerLogService.writeLog(LogLevel.Trace, `LED Update für ${this.info.customName} auf ${state.val}`);
        this.on = state.val as boolean;
        break;
      case 'brightness':
        ServerLogService.writeLog(LogLevel.Trace, `LED Helligkeit Update für ${this.info.customName} auf ${state.val}`);
        this.brightness = state.val as number;
        break;
      case 'color':
        ServerLogService.writeLog(LogLevel.Trace, `LED Color Update für ${this.info.customName} auf ${state.val}`);
        this.color = state.val as string;
        break;
      case 'colortemp':
        ServerLogService.writeLog(LogLevel.Trace, `LED Color Update für ${this.info.customName} auf ${state.val}`);
        this.colortemp = state.val as number;
        break;
    }
  }

  public setTimeBased(time: TimeOfDay): void {
    switch (time) {
      case TimeOfDay.Night:
        if (this.settings.nightOn) {
          this.setLight(true, this.settings.nightBrightness, this.settings.nightColor, this.settings.nightColorTemp);
        }
        break;
      case TimeOfDay.AfterSunset:
        if (this.settings.duskOn) {
          this.setLight(true, this.settings.duskBrightness, this.settings.duskColor, this.settings.duskColorTemp);
        }
        break;
      case TimeOfDay.BeforeSunrise:
        if (this.settings.dawnOn) {
          this.setLight(true, this.settings.dawnBrightness, this.settings.dawnColor, this.settings.dawnColorTemp);
        }
        break;
      case TimeOfDay.Daylight:
        if (this.settings.dayOn) {
          this.setLight(true, this.settings.dayBrightness, this.settings.dayColor, this.settings.dayColorTemp);
        }
        break;
    }
  }

  public setLight(pValue: boolean, brightness: number = -1, color: string = '', colortemp: number = -1): void {
    if (this.stateID === '') {
      ServerLogService.writeLog(LogLevel.Error, `Keine State ID für "${this.info.customName}" bekannt.`);
      return;
    }

    if (!this.ioConn) {
      ServerLogService.writeLog(LogLevel.Error, `Keine Connection für "${this.info.customName}" bekannt.`);
      return;
    }

    if (pValue && brightness === -1 && this.brightness < 10) {
      brightness = 10;
    }
    ServerLogService.writeLog(
      LogLevel.Debug,
      `LED Schalten: "${this.info.customName}" An: ${pValue}\tHelligkeit: ${brightness}%\tFarbe: "${color}"\tColorTemperatur: ${colortemp}`,
    );

    if (color !== '') {
      this.ioConn.setState(this.colorID, color, (err) => {
        if (err) {
          ServerLogService.writeLog(LogLevel.Error, `LED Farbe schalten ergab Fehler: ${err}`);
        }
      });
    }

    if (colortemp > -1) {
      this.ioConn.setState(this.colorTempID, colortemp, (err) => {
        if (err) {
          ServerLogService.writeLog(LogLevel.Error, `LED Farbwärme schalten ergab Fehler: ${err}`);
        }
      });
    }

    this.ioConn.setState(this.stateID, pValue, (err) => {
      if (err) {
        ServerLogService.writeLog(LogLevel.Error, `LED schalten ergab Fehler: ${err}`);
      }
    });

    if (brightness > -1) {
      this.ioConn.setState(this.brightnessID, brightness, (err) => {
        if (err) {
          ServerLogService.writeLog(LogLevel.Error, `LED Helligkeit schalten ergab Fehler: ${err}`);
        }
      });
    }
  }

  public toggleLight(): boolean {
    const newVal = !this.on;
    this.setLight(newVal);
    return newVal;
  }
}
