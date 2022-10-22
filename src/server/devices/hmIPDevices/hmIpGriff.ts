import { DeviceType } from '../deviceType';
import { iDisposable, TelegramService, Utils, WeatherService } from '../../services';
import { WindowPosition } from '../models';
import { HeatGroup, Window } from '../groups';
import { LogLevel } from '../../../models';
import _ from 'lodash';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { HmIPDevice } from './hmIpDevice';
import { iBatteryDevice, iHandleSensor } from '../baseDeviceInterfaces';
import { DeviceCapability } from '../DeviceCapability';

export class HmIpGriff extends HmIPDevice implements iHandleSensor, iBatteryDevice, iDisposable {
  private _battery: number = -99;

  public get battery(): number {
    return this._battery;
  }

  public position: WindowPosition = WindowPosition.geschlossen;
  private _kippCallback: Array<(pValue: boolean) => void> = [];
  private _closedCallback: Array<(pValue: boolean) => void> = [];
  private _offenCallback: Array<(pValue: boolean) => void> = [];
  private _iOpenTimeout: NodeJS.Timeout | undefined;
  public minutesOpen: number = 0;
  private _window: Window | undefined = undefined;
  private _helpingRoomTemp: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpGriff);
    this.deviceCapabilities.push(DeviceCapability.handleSensor);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  public set window(value: Window) {
    this._window = value;
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
      case '0':
        switch (idSplit[4]) {
          case 'OPERATING_VOLTAGE':
            this._battery = 100 * (((state.val as number) - 0.9) / 0.6);
            this.persistBatteryDevice();
            break;
        }
        break;
      case '1':
        switch (idSplit[4]) {
          case 'STATE':
            this.updatePosition(state.val as WindowPosition);
            break;
          case 'OPERATING_VOLTAGE':
            this._battery = 100 * (((state.val as number) - 0.9) / 0.6);
            this.persistBatteryDevice();
            break;
        }
        break;
    }
  }

  public updatePosition(pValue: WindowPosition): void {
    if (pValue === this.position) {
      return;
    }

    this.log(LogLevel.Trace, `Update Windowhandle to position "${WindowPosition[pValue]}"`);

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

    if (pValue === WindowPosition.geschlossen) {
      if (this._iOpenTimeout !== undefined) {
        clearInterval(this._iOpenTimeout);
        this.log(LogLevel.Info, `Window closed after ${this.minutesOpen} minutes`);
        this.minutesOpen = 0;
        this._iOpenTimeout = undefined;
      }
      return;
    } else if (this._iOpenTimeout === undefined) {
      this._iOpenTimeout = Utils.guardedInterval(
        () => {
          this.minutesOpen++;
          const heatgroup: HeatGroup | undefined = this._window?.getRoom().HeatGroup;
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
                const info: string = `Window should be closed, as it doesn't help reaching target temperature.`;
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
          const message = `Window is in position ${WindowPosition[this.position]} since ${this.minutesOpen} minutes`;
          switch (this.minutesOpen) {
            case 15:
            case 30:
            case 60:
            case 120:
            case 240:
              this.log(LogLevel.Info, message);
              TelegramService.inform(`${this.info.room}: ${message}`);
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

  public persistBatteryDevice(): void {
    Utils.dbo?.persistBatteryDevice(this);
  }

  public dispose(): void {
    if (this._iOpenTimeout) {
      clearInterval(this._iOpenTimeout);
      this._iOpenTimeout = undefined;
    }
  }

  public toJSON(): Partial<IoBrokerBaseDevice> {
    return _.omit(super.toJSON(), ['_window']);
  }
}
