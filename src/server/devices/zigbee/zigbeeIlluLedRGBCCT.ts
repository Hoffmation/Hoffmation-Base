import { DeviceType } from '../deviceType';
import { LedSettings, LogLevel, TimeOfDay } from '../../../models';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { ZigbeeIlluDimmer } from './zigbeeIlluDimmer';

export class ZigbeeIlluLedRGBCCT extends ZigbeeIlluDimmer {
  public static DEFAULT_COLOR_WARM: string = '#f2b200';
  public color: string = '#fcba32';
  public colortemp: number = 500;
  public override settings: LedSettings = new LedSettings();
  private colorID: string = '';
  private colorTempID: string = '';

  // private effectID: string = '';

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeIlluLedRGBCCT);
    this.colorID = `${this.info.fullID}.color`;
    this.colorTempID = `${this.info.fullID}.colortemp`;
    // this.effectID = `${this.info.fullID}.effect`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `LED Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial);
    switch (idSplit[3]) {
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

  public override setTimeBased(time: TimeOfDay, timeout: number = -1, force: boolean = false): void {
    switch (time) {
      case TimeOfDay.Night:
        if (this.settings.nightOn) {
          this.setLight(
            true,
            timeout,
            force,
            this.settings.nightBrightness,
            undefined,
            this.settings.nightColor,
            this.settings.nightColorTemp,
          );
        }
        break;
      case TimeOfDay.AfterSunset:
        if (this.settings.duskOn) {
          this.setLight(
            true,
            timeout,
            force,
            this.settings.duskBrightness,
            undefined,
            this.settings.duskColor,
            this.settings.duskColorTemp,
          );
        }
        break;
      case TimeOfDay.BeforeSunrise:
        if (this.settings.dawnOn) {
          this.setLight(
            true,
            timeout,
            force,
            this.settings.dawnBrightness,
            undefined,
            this.settings.dawnColor,
            this.settings.dawnColorTemp,
          );
        }
        break;
      case TimeOfDay.Daylight:
        if (this.settings.dayOn) {
          this.setLight(
            true,
            timeout,
            force,
            this.settings.dayBrightness,
            undefined,
            this.settings.dayColor,
            this.settings.dayColorTemp,
          );
        }
        break;
    }
  }

  public override setLight(
    pValue: boolean,
    timeout?: number,
    force?: boolean,
    brightness: number = -1,
    transitionTime?: number,
    color: string = '',
    colorTemp: number = -1,
  ): void {
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
      `LED Schalten An: ${pValue}\tHelligkeit: ${brightness}%\tFarbe: "${color}"\tColorTemperatur: ${colorTemp}`,
    );
    super.setLight(pValue, timeout, force, brightness, transitionTime);

    if (color !== '') {
      this.ioConn.setState(this.colorID, color, (err) => {
        if (err) {
          this.log(LogLevel.Error, `LED Farbe schalten ergab Fehler: ${err}`);
        }
      });
    }

    if (colorTemp > -1) {
      this.ioConn.setState(this.colorTempID, colorTemp, (err) => {
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
  }
}
