import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { iBatteryDevice, iButtonSwitch } from '../baseDeviceInterfaces';
import { Button, ButtonCapabilities, ButtonPosition, ButtonPressType } from '../button';
import { LogLevel } from '../../../models';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { Utils } from '../../services';

export class HmIpTaster extends HmIPDevice implements iButtonSwitch, iBatteryDevice {
  private _battery: number = -99;
  private _lastBatteryPersist: number = 0;
  public get lastBatteryPersist(): number {
    return this._lastBatteryPersist;
  }

  private static readonly BUTTON_CAPABILLITIES: ButtonCapabilities = {
    shortPress: true,
    longPress: true,
    doublePress: false,
    triplePress: false,
  };

  public buttonTopLeft: Button;
  public buttonMidLeft: Button;
  public buttonBotLeft: Button;
  public buttonTopRight: Button;
  public buttonMidRight: Button;
  public buttonBotRight: Button;
  public buttonBot: undefined = undefined;
  public buttonTop: undefined = undefined;

  public get battery(): number {
    return this._battery;
  }

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpTaster);
    this.deviceCapabilities.push(DeviceCapability.buttonSwitch);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
    this.buttonTopLeft = new Button('TopLeft', HmIpTaster.BUTTON_CAPABILLITIES);
    this.buttonMidLeft = new Button('MidLeft', HmIpTaster.BUTTON_CAPABILLITIES);
    this.buttonBotLeft = new Button('BotLeft', HmIpTaster.BUTTON_CAPABILLITIES);
    this.buttonTopRight = new Button('TopRight', HmIpTaster.BUTTON_CAPABILLITIES);
    this.buttonMidRight = new Button('MidRight', HmIpTaster.BUTTON_CAPABILLITIES);
    this.buttonBotRight = new Button('BotRight', HmIpTaster.BUTTON_CAPABILLITIES);
  }

  public persist(buttonName: string, pressType: ButtonPressType): void {
    Utils.dbo?.persistSwitchInput(this, pressType, buttonName);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Taster Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);
    let cTaste: Button | undefined = undefined;
    switch (idSplit[3]) {
      case '0':
        switch (idSplit[4]) {
          case 'OPERATING_VOLTAGE':
            this._battery = 100 * (((state.val as number) - 1.8) / 1.2);
            this.persistBatteryDevice();
            break;
        }
        break;
      case '1':
        cTaste = this.buttonTopLeft;
        break;
      case '2':
        cTaste = this.buttonTopRight;
        break;
      case '3':
        cTaste = this.buttonMidLeft;
        break;
      case '4':
        cTaste = this.buttonMidRight;
        break;
      case '5':
        cTaste = this.buttonBotLeft;
        break;
      case '6':
        cTaste = this.buttonBotRight;
        break;
    }

    if (cTaste === undefined) {
      return;
    }

    const boolVal = state.val as boolean;
    let pressType: ButtonPressType | undefined;
    switch (idSplit[4]) {
      case 'PRESS_SHORT':
        if (!initial) {
          // Tasten beim Starten ignorieren
          pressType = ButtonPressType.short;
        }
        break;
      case 'PRESS_LONG':
        if (!initial) {
          // Tasten beim Starten ignorieren
          pressType = ButtonPressType.long;
        }
        break;
    }
    if (pressType == undefined) {
      return;
    }
    if (boolVal && !cTaste.isPressActive(pressType)) {
      this.persist(cTaste.name, pressType);
    }
    cTaste.updateState(pressType, boolVal);
  }

  public getButtonAssignment(): string {
    const result: string[] = [`Button: ${this.info.customName}`];
    for (const taste of [
      this.buttonTopLeft,
      this.buttonTopRight,
      this.buttonMidLeft,
      this.buttonMidRight,
      this.buttonBotLeft,
      this.buttonBotRight,
    ]) {
      const desc: string = taste.getDescription();
      if (desc === '') {
        continue;
      }
      result.push(`Button "${taste.name}":`);
      result.push(desc);
      result.push('');
    }
    result.push('____________');
    return result.join('\n');
  }

  public persistBatteryDevice(): void {
    const now: number = Utils.nowMS();
    if (this._lastBatteryPersist + 60000 > now) {
      return;
    }
    Utils.dbo?.persistBatteryDevice(this);
    this._lastBatteryPersist = now;
  }

  public pressButton(position: ButtonPosition, pressType: ButtonPressType): Error | null {
    let taste: Button | undefined;
    switch (position) {
      case ButtonPosition.topLeft:
        taste = this.buttonTopLeft;
        break;
      case ButtonPosition.topRight:
        taste = this.buttonTopRight;
        break;
      case ButtonPosition.midLeft:
        taste = this.buttonMidLeft;
        break;
      case ButtonPosition.midRight:
        taste = this.buttonMidRight;
        break;
      case ButtonPosition.botLeft:
        taste = this.buttonBotLeft;
        break;
      case ButtonPosition.botRight:
        taste = this.buttonBotRight;
        break;
      case ButtonPosition.top:
        taste = this.buttonTop;
        break;
      case ButtonPosition.bottom:
        taste = this.buttonBot;
        break;
      default:
        return new Error(`Unknown Button Position: ${position}`);
    }

    if (taste === undefined) {
      return new Error(`Switch has no Button at position ${position}`);
    }

    const result = taste.press(pressType);
    if (result === null) {
      this.log(LogLevel.Info, `Simulated ButtonPress for ${taste.name} type: ${pressType}`);
    }
    return result;
  }
}
