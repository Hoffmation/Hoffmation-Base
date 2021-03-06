import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { Button, ButtonCapabilities, ButtonPressType } from '../button';
import { LogLevel } from '../../../models';
import { iButtonSwitch } from '../baseDeviceInterfaces';

export class HmIpWippe extends HmIPDevice implements iButtonSwitch {
  private static readonly BUTTON_CAPABILLITIES: ButtonCapabilities = {
    shortPress: true,
    longPress: true,
    doublePress: false,
    triplePress: false,
  };

  public buttonTopLeft: undefined;
  public buttonMidLeft: undefined;
  public buttonBotLeft: undefined;
  public buttonTopRight: undefined;
  public buttonMidRight: undefined;
  public buttonBotRight: undefined;
  public buttonBot: Button = new Button('Bottom', HmIpWippe.BUTTON_CAPABILLITIES);
  public buttonTop: Button = new Button('Top', HmIpWippe.BUTTON_CAPABILLITIES);

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpWippe);
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

    switch (idSplit[4]) {
      case 'PRESS_SHORT':
        if (!initial) {
          // Tasten beim Starten ignorieren
          this.log(LogLevel.Debug, `Tasten Update initial ignoriert`);
          cTaste.updateState(ButtonPressType.short, state.val as boolean);
        }
        break;
      case 'PRESS_LONG':
        if (!initial) {
          // Tasten beim Starten ignorieren
          this.log(LogLevel.Debug, `Tasten Update initial ignoriert`);
          cTaste.updateState(ButtonPressType.long, state.val as boolean);
        }
        break;
    }
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
}
