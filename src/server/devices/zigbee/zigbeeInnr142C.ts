import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceType } from '../deviceType';
import { ZigbeeLedRGBCCT } from './BaseDevices';
import { LogLevel } from '../../../models';
import { Utils } from '../../services';

export class ZigbeeInnr142C extends ZigbeeLedRGBCCT {
  protected readonly _stateIdBrightness: string;
  protected readonly _stateIdColor: string;
  protected readonly _stateIdColorTemp: string;
  protected readonly _stateIdState: string;
  protected readonly _stateIdTransitionTime: string;
  protected readonly _stateNameBrightness: string = 'brightness';
  protected readonly _stateNameState: string = 'state';
  protected readonly _stateNameTransitionTime: string = 'transition_time';
  protected readonly _stateNameColor: string = 'color';
  protected readonly _stateNameColorTemp: string = 'colortemp';
  protected readonly _debounceStateDelay: number = 3500;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeInnr142C);
    this._stateIdBrightness = `${this.info.fullID}.brightness`;
    this._stateIdColor = `${this.info.fullID}.color`;
    this._stateIdColorTemp = `${this.info.fullID}.colortemp`;
    this._stateIdState = `${this.info.fullID}.state`;
    this._stateIdTransitionTime = `${this.info.fullID}.transition_time`;
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
      `LED Schalten An: ${pValue}\tHelligkeit: ${brightness}%\tFarbe: "${color}"\tColorTemperatur: ${colorTemp}\tTransition Time: ${transitionTime}`,
    );

    super.setLight(pValue, timeout, force, brightness, transitionTime);

    const formattedColor: string | null = Utils.formatHex(color);
    if (!pValue) {
      return;
    }

    // Farben nur beim Einschalten setzen
    if (formattedColor !== null && this.color !== formattedColor) {
      this.setState(this._stateIdColor, formattedColor);
    }

    if (colorTemp > -1 && this.colortemp !== colorTemp) {
      this.setState(this._stateIdColorTemp, colorTemp);
    }
  }
}
