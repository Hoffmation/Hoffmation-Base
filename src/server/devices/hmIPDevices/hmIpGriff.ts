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
import { HandleSettings } from '../../../models/deviceSettings/handleSettings';

export class HmIpGriff extends HmIPDevice implements iHandleSensor, iBatteryDevice, iDisposable {
  /** @inheritDoc */
  public settings: HandleSettings = new HandleSettings();
  /** @inheritDoc */
  public position: WindowPosition = WindowPosition.geschlossen;
  /** @inheritDoc */
  public minutesOpen: number = 0;
  private _battery: number = -99;
  private _lastBatteryPersist: number = 0;
  private _lastHandlePersist: number = 0;
  private _kippCallback: Array<(pValue: boolean) => void> = [];
  private _closedCallback: Array<(pValue: boolean) => void> = [];
  private _offenCallback: Array<(pValue: boolean) => void> = [];
  private _iOpenTimeout: NodeJS.Timeout | undefined;
  private _window: Window | undefined = undefined;
  private _helpingRoomTemp: boolean = false;

  /**
   * Creates an instance of {@link DeviceType.HmIpGriff}.
   * @param pInfo - Device creation information
   */
  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.HmIpGriff);
    this.deviceCapabilities.push(DeviceCapability.handleSensor);
    this.deviceCapabilities.push(DeviceCapability.batteryDriven);
  }

  /** @inheritDoc */
  public get lastBatteryPersist(): number {
    return this._lastBatteryPersist;
  }

  /** @inheritDoc */
  public get battery(): number {
    return this._battery;
  }

  /**
   * Adds a window to this device
   */
  public set window(value: Window) {
    this._window = value;
  }

  /** @inheritDoc */
  public addOffenCallback(pCallback: (pValue: boolean) => void): void {
    this._offenCallback.push(pCallback);
  }

  /** @inheritDoc */
  public addKippCallback(pCallback: (pValue: boolean) => void): void {
    this._kippCallback.push(pCallback);
  }

  /** @inheritDoc */
  public addClosedCallback(pCallback: (pValue: boolean) => void): void {
    this._closedCallback.push(pCallback);
  }

  /** @inheritDoc */
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

  /** @inheritDoc */
  public persistBatteryDevice(): void {
    const now: number = Utils.nowMS();
    if (this._lastBatteryPersist + 60000 > now) {
      return;
    }
    Utils.dbo?.persistBatteryDevice(this);
    this._lastBatteryPersist = now;
  }

  /**
   * Persists the handle sensor state to the persistence layer
   */
  public persistHandleSensor(): void {
    const now: number = Utils.nowMS();
    if (this._lastHandlePersist + 2000 > now) {
      return;
    }
    this.log(LogLevel.Debug, `Persist handle state: ${this.position}`);
    Utils.dbo?.persistHandleSensor(this);
    this._lastHandlePersist = now;
  }

  /** @inheritDoc */
  public dispose(): void {
    if (this._iOpenTimeout) {
      clearInterval(this._iOpenTimeout);
      this._iOpenTimeout = undefined;
    }
  }

  /** @inheritDoc */
  public toJSON(): Partial<IoBrokerBaseDevice> {
    return _.omit(super.toJSON(), ['_window']);
  }

  private updatePosition(pValue: WindowPosition): void {
    if (pValue === this.position) {
      if (this._lastHandlePersist == 0) {
        this.persistHandleSensor();
      }
      return;
    }

    this.log(LogLevel.Debug, `Update Windowhandle to position "${WindowPosition[pValue]}"`);

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
    this.persistHandleSensor();

    if (pValue === WindowPosition.geschlossen) {
      if (this._iOpenTimeout !== undefined) {
        clearInterval(this._iOpenTimeout);
        this.log(LogLevel.Info, `Window closed after ${this.minutesOpen} minutes`);
        this.minutesOpen = 0;
        this._iOpenTimeout = undefined;
      }
      return;
    }
    if (this._iOpenTimeout !== undefined) {
      return;
    }

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
              const info: string = "Window should be closed, as it doesn't help reaching target temperature.";
              this.log(LogLevel.Info, info);
              if (this.settings.informNotHelping) {
                TelegramService.inform(info);
              }
              this._helpingRoomTemp = false;
            } else if (wouldHelp && !this._helpingRoomTemp) {
              this._helpingRoomTemp = true;
              const info: string = `Das Fenster hilft der Innentemperatur ihr Ziel von ${desiredTemp} zu erreichen. Draußen sind es ${outSideTemp}. Du wirst informiert wenn es nicht mehr hilft.`;
              this.log(LogLevel.Info, info);
              if (this.settings.informIsHelping) {
                TelegramService.inform(info);
              }
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
            if (this.settings.informOnOpen) {
              TelegramService.inform(`${this.info.room}: ${message}`);
            }
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
