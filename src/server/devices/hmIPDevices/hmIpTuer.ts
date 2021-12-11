import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { ServerLogService } from '../../services/log-service';
import { Utils } from '../../services/utils/utils';
import { MagnetPosition } from '../models/MagnetPosition';
import { DeviceInfo } from '../DeviceInfo';
import { TelegramService } from '../../services/Telegram/telegram-service';
import { LogLevel } from '../../../models/logLevel';
import { SonosService } from '../../services/Sonos/sonos-service';

export class HmIpTuer extends HmIPDevice {
  public position: MagnetPosition = MagnetPosition.closed;
  private _closedCallback: Array<(pValue: boolean) => void> = [];
  private _openCallback: Array<(pValue: boolean) => void> = [];
  private _iOpen: NodeJS.Timeout | undefined;
  private minutesOpen: number = 0;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpTuer);
  }

  public addOpenCallback(pCallback: (pValue: boolean) => void): void {
    this._openCallback.push(pCallback);
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
            this.position = MagnetPosition.closed;
            return;
          }
          this.updatePosition(state.val as MagnetPosition);
        }
        break;
    }
  }

  public updatePosition(pValue: MagnetPosition): void {
    if (pValue === this.position) {
      return;
    }

    ServerLogService.writeLog(
      LogLevel.Trace,
      `Update for Contact "${this.info.customName}" to position "${MagnetPosition[pValue]}"`,
    );

    this.position = pValue;
    for (const c1 of this._closedCallback) {
      c1(pValue === 0);
    }

    for (const c2 of this._openCallback) {
      c2(pValue === 1);
    }

    if (pValue === MagnetPosition.closed) {
      if (this._iOpen !== undefined) {
        clearInterval(this._iOpen);

        let message = `${this.info.customName} closed after ${this.minutesOpen} minutes!`;
        if (this.minutesOpen === 0) {
          message = `"${this.info.customName}" just closed`;
        }
        // const message: string = `Die Tür mit dem Namen "${this.info.customName}" wurde nach ${this.minutesOpen} Minuten geschlossen!`;
        ServerLogService.writeLog(LogLevel.Info, message);

        TelegramService.inform(message);
        this.minutesOpen = 0;
        this._iOpen = undefined;
      }
      return;
    } else if (this._iOpen === undefined) {
      const message = `"${this.info.customName}" was opened`;
      //const message: string = `Die Tür mit dem Namen "${this.info.customName}" wurde geöfnet!`
      TelegramService.inform(message);
      SonosService.speakOnAll(message, 40);
      this._iOpen = Utils.guardedInterval(
        () => {
          this.minutesOpen++;
          const message = `Contact: "${this.info.customName}" is  ${MagnetPosition[this.position]} since ${
            this.minutesOpen
          } minutes`;
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
