import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models/logLevel';
import { ServerLogService } from '../../services/log-service';
import { TuerPosition } from './TuerPosition';
import { SonosService } from '../../services/Sonos/sonos-service';
import { TelegramService } from '../../services/Telegram/telegram-service';
import { Utils } from '../../services/utils/utils';

export class HmIpTuer extends HmIPDevice {
  public position: TuerPosition = TuerPosition.geschlossen;
  private _closedCallback: Array<(pValue: boolean) => void> = [];
  private _offenCallback: Array<(pValue: boolean) => void> = [];
  private _iOpen: NodeJS.Timeout | undefined;
  private minutesOpen: number = 0;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpTuer);
  }

  public addOffenCallback(pCallback: (pValue: boolean) => void): void {
    this._offenCallback.push(pCallback);
  }

  public addClosedCallback(pCallback: (pValue: boolean) => void): void {
    this._closedCallback.push(pCallback);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Tuer Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`,
    );
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case '1':
        if (idSplit[4] === 'STATE') {
          if (initial) {
            this.position = TuerPosition.geschlossen;
            return;
          }
          this.updatePosition(state.val as TuerPosition);
        }
        break;
    }
  }

  public updatePosition(pValue: TuerPosition): void {
    if (pValue === this.position) {
      return;
    }

    ServerLogService.writeLog(
      LogLevel.Trace,
      `Update Tür "${this.info.customName}"\nauf Position "${TuerPosition[pValue]}"`,
    );

    this.position = pValue;
    for (const c1 of this._closedCallback) {
      c1(pValue === 0);
    }

    for (const c2 of this._offenCallback) {
      c2(pValue === 1);
    }

    if (pValue === TuerPosition.geschlossen) {
      if (this._iOpen !== undefined) {
        clearInterval(this._iOpen);

        let message = `Die Haustür ist nun nach ${this.minutesOpen} Minuten wieder zu!`;
        if (this.minutesOpen === 0) {
          message = 'Die Haustür ist wieder zu.';
        }
        // const message: string = `Die Tür mit dem Namen "${this.info.customName}" wurde nach ${this.minutesOpen} Minuten geschlossen!`;
        ServerLogService.writeLog(LogLevel.Info, message);

        TelegramService.inform(message);
        this.minutesOpen = 0;
        this._iOpen = undefined;
      }
      return;
    } else if (this._iOpen === undefined) {
      const message = `Die Haustür wurde geöffnet!`;
      //const message: string = `Die Tür mit dem Namen "${this.info.customName}" wurde geöfnet!`
      TelegramService.inform(message);
      SonosService.speakOnAll(message, 40);
      this._iOpen = Utils.guardedInterval(
        () => {
          this.minutesOpen++;
          const message = `Tuer: "${this.info.customName}" seit ${this.minutesOpen} Minuten auf Position ${
            TuerPosition[this.position]
          }`;
          switch (this.minutesOpen) {
            case 2:
            case 5:
            case 10:
            case 20:
            case 45:
            case 60:
              ServerLogService.writeLog(LogLevel.Info, message);
              TelegramService.inform(message);
              break;
            default:
              ServerLogService.writeLog(LogLevel.Trace, message);
              break;
          }
        },
        60000,
        this,
      );
    }
  }
}
