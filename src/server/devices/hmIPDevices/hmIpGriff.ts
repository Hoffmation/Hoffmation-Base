import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { ServerLogService } from '../../services/log-service';
import { Utils } from '../../services/utils/utils';
import { DeviceInfo } from '../DeviceInfo';
import { WeatherService } from '../../services/weather/weather-service';
import { TelegramService } from '../../services/Telegram/telegram-service';
import { FensterPosition } from '../models/FensterPosition';
import { Fenster } from '../Fenster';
import { LogLevel } from '../../../models/logLevel';
import { HeatGroup } from '../groups/heatGroup';
import _ from 'lodash';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';

export class HmIpGriff extends HmIPDevice {
  public position: FensterPosition = FensterPosition.geschlossen;
  private _kippCallback: Array<(pValue: boolean) => void> = [];
  private _closedCallback: Array<(pValue: boolean) => void> = [];
  private _offenCallback: Array<(pValue: boolean) => void> = [];
  private _iOpenTimeout: NodeJS.Timeout | undefined;
  private minutesOpen: number = 0;
  private _fenster: Fenster | undefined = undefined;
  private _helpingRoomTemp: boolean = false;

  public constructor(pInfo: DeviceInfo) {
    super(pInfo, DeviceType.HmIpGriff);
  }

  public addOffenCallback(pCallback: (pValue: boolean) => void): void {
    this._offenCallback.push(pCallback);
  }

  public addKippCallback(pCallback: (pValue: boolean) => void): void {
    this._kippCallback.push(pCallback);
  }

  public addClosedCallback(pCallback: (pValue: boolean) => void): void {
    this._closedCallback.push(pCallback);
  }

  public set Fenster(value: Fenster) {
    this._fenster = value;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    ServerLogService.writeLog(
      LogLevel.DeepTrace,
      `Griff Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`,
    );
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case '1':
        if (idSplit[4] === 'STATE') {
          this.updatePosition(state.val as FensterPosition);
        }
        break;
    }
  }

  public updatePosition(pValue: FensterPosition): void {
    if (pValue === this.position) {
      return;
    }

    ServerLogService.writeLog(
      LogLevel.Trace,
      `Update Fenstergriff "${this.info.customName}"\nauf Position "${FensterPosition[pValue]}"`,
    );

    this.position = pValue;
    for (const c1 of this._closedCallback) {
      c1(pValue === 0);
    }

    for (const c2 of this._kippCallback) {
      c2(pValue === 1);
    }

    for (const c3 of this._offenCallback) {
      c3(pValue === 2);
    }

    if (pValue === FensterPosition.geschlossen) {
      if (this._iOpenTimeout !== undefined) {
        clearInterval(this._iOpenTimeout);
        ServerLogService.writeLog(
          LogLevel.Info,
          `Fenster: "${this.info.customName}" nach ${this.minutesOpen} Minuten geschlossen`,
        );
        this.minutesOpen = 0;
        this._iOpenTimeout = undefined;
      }
      return;
    } else if (this._iOpenTimeout === undefined) {
      this._iOpenTimeout = Utils.guardedInterval(
        () => {
          this.minutesOpen++;
          const heatgroup: HeatGroup | undefined = this._fenster?.getRoom().HeatGroup;
          if (heatgroup !== undefined) {
            const desiredTemp: number = heatgroup.desiredTemp;
            const currentTemp: number = heatgroup.currentTemp;
            const outSideTemp: number = WeatherService.getCurrentTemp();

            // Check if any of these values are unavailable
            if (desiredTemp > -99 && currentTemp > -99 && outSideTemp > -99) {
              const wouldHelp: boolean =
                (desiredTemp < currentTemp && outSideTemp < currentTemp) ||
                (desiredTemp > currentTemp && outSideTemp > currentTemp);
              if (!wouldHelp && this._helpingRoomTemp) {
                const info: string = `Das Fenster "${this.info.customName}" sollte geschlossen werden, es hilft dem Raum nicht mehr`;
                ServerLogService.writeLog(LogLevel.Info, info);
                TelegramService.inform(info);
                this._helpingRoomTemp = false;
              } else if (wouldHelp && !this._helpingRoomTemp) {
                this._helpingRoomTemp = true;
                const info: string = `Das Fenster "${this.info.customName}" hilft der Innentemperatur ihr Ziel von ${desiredTemp} zu erreichen. Draußen sind es ${outSideTemp}. Du wirst informiert wenn es nicht mehr hilft.`;
                ServerLogService.writeLog(LogLevel.Info, info);
                TelegramService.inform(info);
                return;
              } else if (wouldHelp && this._helpingRoomTemp) {
                return;
              }
            }
          }
          const message = `Fenster: "${this.info.customName}" seit ${this.minutesOpen} Minuten auf Position ${
            FensterPosition[this.position]
          }`;
          switch (this.minutesOpen) {
            case 15:
            case 30:
            case 60:
            case 120:
            case 240:
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

  public toJSON(): Partial<IoBrokerBaseDevice> {
    return _.omit(super.toJSON(), ['_fenster']);
  }
}
