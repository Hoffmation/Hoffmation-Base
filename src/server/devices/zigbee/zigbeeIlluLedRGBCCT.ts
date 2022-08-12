import { DeviceType } from '../deviceType';
import { LedSettings, LogLevel, TimeOfDay } from '../../../models';
import { ZigbeeDevice } from './BaseDevices';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

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

  // private effectID: string = '';

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluLedRGBCCT);
    this.stateID = `${this.info.fullID}.state`;
    this.brightnessID = `${this.info.fullID}.brightness`;
    this.colorID = `${this.info.fullID}.color`;
    this.colorTempID = `${this.info.fullID}.colortemp`;
    // this.effectID = `${this.info.fullID}.effect`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `LED Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        this.log(LogLevel.Trace, `LED Update für ${this.info.customName} auf ${state.val}`);
        this.on = state.val as boolean;
        break;
      case 'brightness':
        this.log(LogLevel.Trace, `LED Helligkeit Update für ${this.info.customName} auf ${state.val}`);
        this.brightness = state.val as number;
        break;
      case 'color':
        this.log(LogLevel.Trace, `LED Color Update für ${this.info.customName} auf ${state.val}`);
        this.color = state.val as string;
        break;
      case 'colortemp':
        this.log(LogLevel.Trace, `LED Color Update für ${this.info.customName} auf ${state.val}`);
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
      this.log(LogLevel.Error, `Keine State ID bekannt.`);
      return;
    }

    if (!this.ioConn) {
      this.log(LogLevel.Error, `Keine Connection bekannt.`);
      return;
    }

    if (pValue && brightness === -1 && this.brightness < 10) {
      brightness = 10;
    }
    this.log(
      LogLevel.Debug,
      `LED Schalten An: ${pValue}\tHelligkeit: ${brightness}%\tFarbe: "${color}"\tColorTemperatur: ${colortemp}`,
    );

    if (color !== '') {
      this.ioConn.setState(this.colorID, color, (err) => {
        if (err) {
          this.log(LogLevel.Error, `LED Farbe schalten ergab Fehler: ${err}`);
        }
      });
    }

    if (colortemp > -1) {
      this.ioConn.setState(this.colorTempID, colortemp, (err) => {
        if (err) {
          this.log(LogLevel.Error, `LED Farbwärme schalten ergab Fehler: ${err}`);
        }
      });
    }

    this.ioConn.setState(this.stateID, pValue, (err) => {
      if (err) {
        this.log(LogLevel.Error, `LED schalten ergab Fehler: ${err}`);
      }
    });

    if (brightness > -1) {
      this.ioConn.setState(this.brightnessID, brightness, (err) => {
        if (err) {
          this.log(LogLevel.Error, `LED Helligkeit schalten ergab Fehler: ${err}`);
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
