import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { iButton } from '../iButton';
import { DeviceInfo } from '../DeviceInfo';
import { ButtonCapabilities, ButtonPressType, Button } from '../button';
import { LogLevel } from '../../../models/logLevel';

export class HmIpTaster extends HmIPDevice implements iButton {
  private static readonly BUTTON_CAPABILLITIES: ButtonCapabilities = {
    shortPress: true,
    longPress: true,
    doublePress: false,
    triplePress: false,
  };
  public tasten: { [id: string]: Button } = {
    ObenLinks: new Button(HmIpTaster.BUTTON_CAPABILLITIES),
    ObenRechts: new Button(HmIpTaster.BUTTON_CAPABILLITIES),
    MitteLinks: new Button(HmIpTaster.BUTTON_CAPABILLITIES),
    MitteRechts: new Button(HmIpTaster.BUTTON_CAPABILLITIES),
    UntenLinks: new Button(HmIpTaster.BUTTON_CAPABILLITIES),
    UntenRechts: new Button(HmIpTaster.BUTTON_CAPABILLITIES),
  };

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpTaster);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Taster Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
    super.update(idSplit, state, initial, true);
    let cTaste: Button | undefined = undefined;
    switch (idSplit[3]) {
      case '1':
        cTaste = this.tasten.ObenLinks;
        break;
      case '2':
        cTaste = this.tasten.ObenRechts;
        break;
      case '3':
        cTaste = this.tasten.MitteLinks;
        break;
      case '4':
        cTaste = this.tasten.MitteRechts;
        break;
      case '5':
        cTaste = this.tasten.UntenLinks;
        break;
      case '6':
        cTaste = this.tasten.UntenRechts;
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

  public getTastenAssignment(): string {
    const result: string[] = [`Button: ${this.info.customName}`];
    for (const tastenName in this.tasten) {
      const desc: string = this.tasten[tastenName].getDescription();
      if (desc === '') {
        continue;
      }
      result.push(`Button "${tastenName}":`);
      result.push(desc);
      result.push('');
    }
    result.push('____________');
    return result.join('\n');
  }
}
