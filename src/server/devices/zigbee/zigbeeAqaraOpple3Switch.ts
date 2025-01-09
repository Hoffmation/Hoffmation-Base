import { ZigbeeSwitch } from './BaseDevices/index.js';
import { Button, ButtonCapabilities, ButtonPressType } from '../button/index.js';
import { DeviceType } from '../deviceType.js';
import { LogLevel } from '../../../models/index.js';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo.js';

export class ZigbeeAqaraOpple3Switch extends ZigbeeSwitch {
  private static readonly BUTTON_CAPABILLITIES: ButtonCapabilities = {
    shortPress: true,
    longPress: true,
    doublePress: true,
    triplePress: true,
  };

  /** @inheritDoc */
  public buttonTopLeft: Button = new Button('TopLeft', ZigbeeAqaraOpple3Switch.BUTTON_CAPABILLITIES);
  /** @inheritDoc */
  public buttonMidLeft: Button = new Button('MidLeft', ZigbeeAqaraOpple3Switch.BUTTON_CAPABILLITIES);
  /** @inheritDoc */
  public buttonBotLeft: Button = new Button('BotLeft', ZigbeeAqaraOpple3Switch.BUTTON_CAPABILLITIES);
  /** @inheritDoc */
  public buttonTopRight: Button = new Button('TopRight', ZigbeeAqaraOpple3Switch.BUTTON_CAPABILLITIES);
  /** @inheritDoc */
  public buttonMidRight: Button = new Button('MidRight', ZigbeeAqaraOpple3Switch.BUTTON_CAPABILLITIES);
  /** @inheritDoc */
  public buttonBotRight: Button = new Button('BotRight', ZigbeeAqaraOpple3Switch.BUTTON_CAPABILLITIES);
  /**
   * Not present for {@link DeviceType.ZigbeeAqaraOpple3Switch}
   * @inheritDoc
   */
  public buttonBot: undefined = undefined;
  /**
   * Not present for {@link DeviceType.ZigbeeAqaraOpple3Switch}
   * @inheritDoc
   */
  public buttonTop: undefined = undefined;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeAqaraOpple3Switch);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Magnet Contact Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);
    const name: string = idSplit[3];
    if (name.startsWith('button_')) {
      this.updateButton(name, state.val as boolean);
    }
  }

  /** @inheritDoc */
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

  private updateButton(name: string, val: boolean): void {
    const parts: string[] = name.split('_');
    if (parts.length < 3) {
      this.log(LogLevel.Error, `Unknown State Name: ${name}, expected something like "button_3_click"`);
      return;
    }
    const index: number = parseInt(parts[1], 10);
    let taste: Button;
    switch (index) {
      case 1:
        taste = this.buttonTopLeft;
        break;
      case 2:
        taste = this.buttonTopRight;
        break;
      case 3:
        taste = this.buttonMidLeft;
        break;
      case 4:
        taste = this.buttonMidRight;
        break;
      case 5:
        taste = this.buttonBotLeft;
        break;
      case 6:
        taste = this.buttonBotRight;
        break;
      default:
        this.log(LogLevel.Error, `Unknown index: ${index} for button, Aqara Opple 3 has only 6 buttons.`);
        return;
    }

    let pressType: ButtonPressType | undefined = undefined;
    switch (parts[2]) {
      case 'single':
        pressType = ButtonPressType.short;
        break;
      case 'hold':
        pressType = ButtonPressType.long;
        break;
      case 'double':
        pressType = ButtonPressType.double;
        break;
      case 'triple':
        pressType = ButtonPressType.triple;
        break;
    }
    if (pressType == undefined) {
      this.log(
        LogLevel.Error,
        `Unknown pressType: "${parts[2]}" for button, Aqara Opple 3 has only types "click, hold, double, triple".`,
      );
      return;
    }
    if (val && !taste.isPressActive(pressType)) {
      this.persist(taste.name, pressType);
    }
    taste.updateState(pressType, val);
  }
}
