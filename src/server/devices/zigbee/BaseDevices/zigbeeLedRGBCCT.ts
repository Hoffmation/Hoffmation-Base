import { DeviceType } from '../../deviceType';
import { LampSetTimeBasedCommand, LedSetLightCommand, LedSettings, LogLevel } from '../../../../models';
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
  public override setTimeBased(c: LampSetTimeBasedCommand): void {
    this.setLight(LedSetLightCommand.byTimeBased(this.settings, c));
  }

  /**
   * @inheritDoc
   */
  public override setLight(c: LedSetLightCommand): void {
    if (this._stateIdState === '') {
      this.log(LogLevel.Error, `Keine State ID bekannt.`);
      return;
    }

    if (!this.ioConn) {
      this.log(LogLevel.Error, `Keine Connection bekannt.`);
      return;
    }

    if (c.on && c.brightness === -1 && this.brightness < 10) {
      c.brightness = 10;
    }
    this.log(
      LogLevel.Debug,
      `LED Schalten An: ${c.on}\tHelligkeit: ${c.brightness}%\tFarbe: "${c.color}"\tColorTemperatur: ${c.colorTemp}\tTransition Time: ${c.transitionTime}`,
    );

    const formattedColor: string | null = Utils.formatHex(c.color);
    if (formattedColor !== null && c.on) {
      this.setState(this._stateIdColor, formattedColor);
    }

    if (c.colorTemp > -1 && c.on) {
      this.setState(this._stateIdColorTemp, c.colorTemp);
    }

    super.setLight(c);
  }
}
