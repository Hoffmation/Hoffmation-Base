import { DeviceType } from '../../deviceType';
import { LedSettings, LogLevel, TimeOfDay } from '../../../../models';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { DeviceCapability } from '../../DeviceCapability';
import { iLedRgbCct } from '../../baseDeviceInterfaces/iLedRgbCct';
import { ZigbeeDimmer } from './zigbeeDimmer';
import { Utils } from '../../../services';

export abstract class ZigbeeLedRGBCCT extends ZigbeeDimmer implements iLedRgbCct {
  public static DEFAULT_COLOR_WARM: string = '#f2b200';
  public override settings: LedSettings = new LedSettings();
  protected abstract readonly _stateIdColor: string;
  protected abstract readonly _stateIdColorTemp: string;
  protected abstract readonly _stateNameColor: string;
  protected abstract readonly _stateNameColorTemp: string;

  protected constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType) {
    super(pInfo, deviceType);
    this.deviceCapabilities.push(DeviceCapability.ledLamp);
    // this.effectID = `${this.info.fullID}.effect`;
  }

  protected _color: string = '#fcba32';

  public get color(): string {
    return this._color;
  }

  protected _colortemp: number = 500;

  public get colortemp(): number {
    return this._colortemp;
  }

  // private effectID: string = '';

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `LED Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial);
    switch (idSplit[3]) {
      case this._stateNameColor:
        this.log(LogLevel.Trace, `LED Color Update für ${this.info.customName} auf ${state.val}`);
        this._color = state.val as string;
        break;
      case this._stateNameColorTemp:
        this.log(LogLevel.Trace, `LED Color Temp Update für ${this.info.customName} auf ${state.val}`);
        this._colortemp = state.val as number;
        break;
    }
  }

  /**
   * @inheritDoc
   */
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

  /**
   * @inheritDoc
   */
  public override setLight(
    pValue: boolean,
    timeout?: number,
    force?: boolean,
    brightness: number = -1,
    transitionTime?: number,
    color: string = '',
    colorTemp: number = -1,
  ): void {
    if (this._stateIdState === '') {
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

    const formattedColor: string | null = Utils.formatHex(color);
    if (formattedColor !== null) {
      this.ioConn.setState(this._stateIdColor, color, (err) => {
        if (err) {
          this.log(LogLevel.Error, `LED Farbe schalten ergab Fehler: ${err}`);
        }
      });
    }

    if (colorTemp > -1) {
      this.ioConn.setState(this._stateIdColorTemp, colorTemp, (err) => {
        if (err) {
          this.log(LogLevel.Error, `LED Farbwärme schalten ergab Fehler: ${err}`);
        }
      });
    }

    super.setLight(pValue, timeout, force, brightness, transitionTime);
  }
}
