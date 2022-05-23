import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { iButtonSwitch } from '../baseDeviceInterfaces';
import { DeviceInfo } from '../DeviceInfo';
import { Button, ButtonCapabilities, ButtonPressType } from '../button';
import { LogLevel } from '../../../models';

export class HmIpTaster extends HmIPDevice implements iButtonSwitch {
  private static readonly BUTTON_CAPABILLITIES: ButtonCapabilities = {
    shortPress: true,
    longPress: true,
    doublePress: false,
    triplePress: false,
  };

  public buttonTopLeft: Button = new Button('TopLeft', HmIpTaster.BUTTON_CAPABILLITIES);
  public buttonMidLeft: Button = new Button('MidLeft', HmIpTaster.BUTTON_CAPABILLITIES);
  public buttonBotLeft: Button = new Button('BotLeft', HmIpTaster.BUTTON_CAPABILLITIES);
  public buttonTopRight: Button = new Button('TopRight', HmIpTaster.BUTTON_CAPABILLITIES);
  public buttonMidRight: Button = new Button('MidRight', HmIpTaster.BUTTON_CAPABILLITIES);
  public buttonBotRight: Button = new Button('BotRight', HmIpTaster.BUTTON_CAPABILLITIES);
  public buttonBot: undefined = undefined;
  public buttonTop: undefined = undefined;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpTaster);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Taster Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);
    let cTaste: Button | undefined = undefined;
    switch (idSplit[3]) {
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

    switch (idSplit[4]) {
      case 'PRESS_SHORT':
        if (!initial) {
          // Tasten beim Starten ignorieren
          cTaste.updateState(ButtonPressType.short, state.val as boolean);
        }
        break;
      case 'PRESS_LONG':
        if (!initial) {
          // Tasten beim Starten ignorieren
          cTaste.updateState(ButtonPressType.long, state.val as boolean);
        }
        break;
    }
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
}
