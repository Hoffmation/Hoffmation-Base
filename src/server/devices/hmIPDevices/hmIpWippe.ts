import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { Button, ButtonCapabilities, ButtonPosition, ButtonPressType } from '../button';
import { LogLevel } from '../../../models';
import { iButtonSwitch } from '../baseDeviceInterfaces';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { Utils } from '../../services';

export class HmIpWippe extends HmIPDevice implements iButtonSwitch {
  private static readonly BUTTON_CAPABILLITIES: ButtonCapabilities = {
    shortPress: true,
    longPress: true,
    doublePress: false,
    triplePress: false,
  };

  /**
   * Not present for HM-IP-Wippe
   * @inheritDoc
   */
  public buttonTopLeft: undefined;
  /**
   * Not present for HM-IP-Wippe
   * @inheritDoc
   */
  public buttonMidLeft: undefined;
  /**
   * Not present for HM-IP-Wippe
   * @inheritDoc
   */
  public buttonBotLeft: undefined;
  /**
   * Not present for HM-IP-Wippe
   * @inheritDoc
   */
  public buttonTopRight: undefined;
  /**
   * Not present for HM-IP-Wippe
   * @inheritDoc
   */
  public buttonMidRight: undefined;
  /**
   * Not present for HM-IP-Wippe
   * @inheritDoc
   */
  public buttonBotRight: undefined;
  /** @inheritDoc */
  public buttonBot: Button = new Button('Bottom', HmIpWippe.BUTTON_CAPABILLITIES);
  /** @inheritDoc */
  public buttonTop: Button = new Button('Top', HmIpWippe.BUTTON_CAPABILLITIES);

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpWippe);
    this.deviceCapabilities.push(DeviceCapability.buttonSwitch);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Wippe Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);
    let cTaste: Button | undefined = undefined;
    switch (idSplit[3]) {
      case '1':
        cTaste = this.buttonBot;
        break;
      case '2':
        cTaste = this.buttonTop;
        break;
    }

    if (cTaste === undefined) {
      return;
    }

    const boolVal: boolean = state.val as boolean;
    switch (idSplit[4]) {
      case 'PRESS_SHORT':
        if (!initial) {
          // Tasten beim Starten ignorieren
          if (boolVal && !cTaste.isPressActive(ButtonPressType.long)) {
            this.persist(cTaste.name, ButtonPressType.short);
          }
          cTaste.updateState(ButtonPressType.short, boolVal);
        }
        break;
      case 'PRESS_LONG':
        if (!initial) {
          // Tasten beim Starten ignorieren
          if (boolVal && !cTaste.isPressActive(ButtonPressType.long)) {
            this.persist(cTaste.name, ButtonPressType.long);
          }
          cTaste.updateState(ButtonPressType.long, boolVal);
        }
        break;
    }
  }

  public persist(buttonName: string, pressType: ButtonPressType): void {
    Utils.dbo?.persistSwitchInput(this, pressType, buttonName);
  }

  public getButtonAssignment(): string {
    const result: string[] = [`Button: ${this.info.customName}`];
    for (const taste of [this.buttonTop, this.buttonBot]) {
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

  public pressButton(position: ButtonPosition, pressType: ButtonPressType): Error | null {
    if (position !== ButtonPosition.top && position !== ButtonPosition.bottom) {
      return new Error(`Switch has no Button at position ${position}`);
    }
    const taste: Button = position === ButtonPosition.top ? this.buttonTop : this.buttonBot;
    const result = taste.press(pressType);
    if (result === null) {
      this.log(LogLevel.Info, `Simulated ButtonPress for ${taste.name} type: ${pressType}`);
    }
    return result;
  }
}
