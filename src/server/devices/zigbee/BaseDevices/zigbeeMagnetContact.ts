import { DeviceType } from '../../deviceType';
import { Res, SonosService, TelegramService, Utils } from '../../../services';
import { DeviceInfo } from '../../DeviceInfo';
import { LogLevel } from '../../../../models';
import { ZigbeeDevice } from './zigbeeDevice';
import { MagnetPosition } from '../../models';

export class ZigbeeMagnetContact extends ZigbeeDevice {
  public position: MagnetPosition = MagnetPosition.closed;
  public telegramOnOpen: boolean = false;
  public speakOnOpen: boolean = false;
  private _closedCallback: Array<(pValue: boolean) => void> = [];
  private _openCallback: Array<(pValue: boolean) => void> = [];
  private _iOpenTimeout: NodeJS.Timeout | undefined;
  private minutesOpen: number = 0;

  public constructor(pInfo: DeviceInfo, deviceType: DeviceType) {
    super(pInfo, deviceType);
  }

  public addOpenCallback(pCallback: (pValue: boolean) => void): void {
    this._openCallback.push(pCallback);
  }

  public addClosedCallback(pCallback: (pValue: boolean) => void): void {
    this._closedCallback.push(pCallback);
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverrride: boolean = false): void {
    super.update(idSplit, state, initial, pOverrride);
  }

  protected updatePosition(pValue: MagnetPosition): void {
    if (pValue === this.position) {
      return;
    }

    this.log(LogLevel.Trace, `Update for Contact  to position "${MagnetPosition[pValue]}"`);

    this.position = pValue;
    for (const c1 of this._closedCallback) {
      c1(pValue === 0);
    }

    for (const c2 of this._openCallback) {
      c2(pValue === 1);
    }

    if (pValue === MagnetPosition.closed) {
      if (this._iOpenTimeout !== undefined) {
        clearInterval(this._iOpenTimeout);

        let message = Res.closedAfterMinutes(this.info.customName, this.minutesOpen.toString(10));
        if (this.minutesOpen === 0) {
          message = Res.justClosed(this.info.customName);
        }
        // const message: string = `Die Tür wurde nach ${this.minutesOpen} Minuten geschlossen!`;
        this.log(LogLevel.Info, message);

        if (this.telegramOnOpen) {
          TelegramService.inform(message);
        }
        this.minutesOpen = 0;
        this._iOpenTimeout = undefined;
      }
      return;
    } else if (this._iOpenTimeout === undefined) {
      const message = Res.wasOpened(this.info.customName);
      if (this.telegramOnOpen) {
        TelegramService.inform(message);
      }
      if (this.speakOnOpen) {
        SonosService.speakOnAll(message, 40);
      }
      this._iOpenTimeout = Utils.guardedInterval(
        () => {
          this.minutesOpen++;
          const message = `Contact is  ${MagnetPosition[this.position]} since ${this.minutesOpen} minutes`;
          switch (this.minutesOpen) {
            case 2:
            case 5:
            case 10:
            case 20:
            case 45:
            case 60:
              this.log(LogLevel.Info, message);
              TelegramService.inform(message);
              break;
            default:
              this.log(LogLevel.Trace, message);
              break;
          }
        },
        60000,
        this,
      );
    }
  }
}
