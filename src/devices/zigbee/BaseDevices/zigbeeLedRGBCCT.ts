import { ZigbeeDimmer } from './zigbeeDimmer';
import { iLedRgbCct } from '../../../interfaces/baseDevices/iLedRgbCct';
import { LedSettings } from '../../../settingsObjects';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { DeviceCapability, DeviceType, LogLevel } from '../../../enums';
import { ActuatorSetStateCommand, LampSetTimeBasedCommand, LedSetLightCommand } from '../../../command';
import { Utils } from '../../../utils';

export abstract class ZigbeeLedRGBCCT extends ZigbeeDimmer implements iLedRgbCct {
  /** @inheritDoc */
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

  /** @inheritDoc */
  public get color(): string {
    return this._color;
  }

  protected _colortemp: number = 500;

  /** @inheritDoc */
  public get colortemp(): number {
    return this._colortemp;
  }

  // private effectID: string = '';

  /** @inheritDoc */
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

  /** @inheritDoc */
  public override setTimeBased(c: LampSetTimeBasedCommand): void {
    this.setLight(LedSetLightCommand.byTimeBased(this.settings, c));
  }

  /** @inheritDoc */
  public override setActuator(c: ActuatorSetStateCommand): void {
    this.setLight(new LedSetLightCommand(c, c.on, '', c.disableAutomaticCommand));
  }

  /** @inheritDoc */
  public override setLight(c: LedSetLightCommand): void {
    if (this._actuatorOnStateIdState === '') {
      this.log(LogLevel.Error, 'Keine State ID bekannt.');
      return;
    }

    if (!this.ioConn) {
      this.log(LogLevel.Error, 'Keine Connection bekannt.');
      return;
    }

    if (c.on && c.brightness === -1 && this.brightness < 10) {
      c.brightness = 10;
    }

    super.setLight(c);

    const formattedColor: string | null = Utils.formatHex(c.color);

    if (formattedColor !== null && c.on && (c.color !== this.color || c.isForceAction)) {
      this.setState(this._stateIdColor, formattedColor);
    }

    if (c.colorTemp > -1 && c.on && (c.colorTemp !== this.colortemp || c.isForceAction)) {
      this.setState(this._stateIdColorTemp, c.colorTemp);
    }
  }
}
