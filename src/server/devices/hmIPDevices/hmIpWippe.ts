import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { ButtonCapabilities, ButtonPressType, Button } from '../button';
import { LogLevel } from '../../../models/logLevel';

export class HmIpWippe extends HmIPDevice {
  private static readonly BUTTON_CAPABILLITIES: ButtonCapabilities = {
    shortPress: true,
    longPress: true,
    doublePress: false,
    triplePress: false,
  };
  public tasten: {
    Unten: Button;
    Oben: Button;
  } = {
    Unten: new Button(HmIpWippe.BUTTON_CAPABILLITIES),
    Oben: new Button(HmIpWippe.BUTTON_CAPABILLITIES),
  };

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpWippe);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Wippe Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);
    let cTaste: Button | undefined = undefined;
    switch (idSplit[3]) {
      case '1':
        cTaste = this.tasten.Unten;
        break;
      case '2':
        cTaste = this.tasten.Oben;
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
}
