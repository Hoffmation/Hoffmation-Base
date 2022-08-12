import { HmIPDevice } from './hmIpDevice';
import { DeviceType } from '../deviceType';
import { TelegramService, Utils, WeatherService } from '../../services';
import { FensterPosition } from '../models';
import { Fenster, HeatGroup } from '../groups';
import { LogLevel } from '../../../models';
import _ from 'lodash';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class HmIpGriff extends HmIPDevice {
  public position: FensterPosition = FensterPosition.geschlossen;
  private _kippCallback: Array<(pValue: boolean) => void> = [];
  private _closedCallback: Array<(pValue: boolean) => void> = [];
  private _offenCallback: Array<(pValue: boolean) => void> = [];
  private _iOpenTimeout: NodeJS.Timeout | undefined;
  private minutesOpen: number = 0;
  private _fenster: Fenster | undefined = undefined;
  private _helpingRoomTemp: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpGriff);
  }

  public set Fenster(value: Fenster) {
    this._fenster = value;
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

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Griff Update: JSON: ${JSON.stringify(state)}ID: ${idSplit.join('.')}`);
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

    this.log(LogLevel.Trace, `Update Fenstergriff auf Position "${FensterPosition[pValue]}"`);

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
        this.log(LogLevel.Info, `Fenster nach ${this.minutesOpen} Minuten geschlossen`);
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
            const currentTemp: number = heatgroup.temperature;
            const outSideTemp: number = WeatherService.getCurrentTemp();

            // Check if any of these values are unavailable
            if (desiredTemp > -99 && currentTemp > -99 && outSideTemp > -99) {
              const wouldHelp: boolean =
                (desiredTemp < currentTemp && outSideTemp < currentTemp) ||
                (desiredTemp > currentTemp && outSideTemp > currentTemp);
              if (!wouldHelp && this._helpingRoomTemp) {
                const info: string = `Das Fenster sollte geschlossen werden, es hilft dem Raum nicht mehr`;
                this.log(LogLevel.Info, info);
                TelegramService.inform(info);
                this._helpingRoomTemp = false;
              } else if (wouldHelp && !this._helpingRoomTemp) {
                this._helpingRoomTemp = true;
                const info: string = `Das Fenster hilft der Innentemperatur ihr Ziel von ${desiredTemp} zu erreichen. Draußen sind es ${outSideTemp}. Du wirst informiert wenn es nicht mehr hilft.`;
                this.log(LogLevel.Info, info);
                TelegramService.inform(info);
                return;
              } else if (wouldHelp && this._helpingRoomTemp) {
                return;
              }
            }
          }
          const message = `Fenster seit ${this.minutesOpen} Minuten auf Position ${FensterPosition[this.position]}`;
          switch (this.minutesOpen) {
            case 15:
            case 30:
            case 60:
            case 120:
            case 240:
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

  public toJSON(): Partial<IoBrokerBaseDevice> {
    return _.omit(super.toJSON(), ['_fenster']);
  }
}
