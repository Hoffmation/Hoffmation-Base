import { iHandle, iHandleSensor, iHeatGroup, iJsonOmitKeys, iWindow } from '../../interfaces';
import { LogDebugType, LogLevel, WindowPosition } from '../../enums';
import { HandleChangeAction } from '../../action';
import { HandleSettings } from '../../settingsObjects';
import { Utils } from '../../utils';
import { WeatherService } from '../../services/weather';
import { Persistence, TelegramService } from '../../services';

export class HandleSensor implements iHandleSensor, iJsonOmitKeys {
  /** @inheritDoc */
  public readonly jsonOmitKeys: string[] = ['_device', 'window'];
  /**
   * The current position of the handle
   */
  public position: WindowPosition = WindowPosition.closed;
  /**
   * The time the handle was open in minutes
   */
  public minutesOpen: number = 0;
  /**
   * The window this handle is attached to
   */
  public window: iWindow | undefined;
  private _lastPersist: number = 0;
  private _kippCallback: Array<(pValue: boolean) => void> = [];
  private _closedCallback: Array<(pValue: boolean) => void> = [];
  private _offenCallback: Array<(pValue: boolean) => void> = [];
  private _handleChangeCallback: Array<(action: HandleChangeAction) => void> = [];
  private _iOpenTimeout: NodeJS.Timeout | undefined;
  private _helpingRoomTemp: boolean = false;

  public constructor(private readonly _device: iHandle) {}

  private get _settings(): HandleSettings {
    return this._device.settings as HandleSettings;
  }

  public updatePosition(pValue: WindowPosition): void {
    if (pValue === this.position) {
      if (this._lastPersist == 0) {
        this.persist();
      }
      return;
    }

    this.log(LogLevel.Debug, `Update Windowhandle to position "${WindowPosition[pValue]}"`);

    this.position = pValue;
    const handleChangeAction: HandleChangeAction = new HandleChangeAction(this._device);
    for (const c1 of this._closedCallback) {
      c1(pValue === 0);
    }

    for (const c2 of this._kippCallback) {
      c2(pValue === 1);
    }

    for (const c3 of this._offenCallback) {
      c3(pValue === 2);
    }

    for (const c4 of this._handleChangeCallback) {
      c4(handleChangeAction);
    }
    this.persist();

    if (pValue === WindowPosition.closed) {
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
        const heatgroup: iHeatGroup | undefined = this.window?.getRoom().HeatGroup;
        if (heatgroup !== undefined) {
          const desiredTemp: number = heatgroup.desiredTemp;
          const currentTemp: number = heatgroup.temperature;
          const outSideTemp: number = WeatherService.currentTemp;

          // Check if any of these values are unavailable
          if (desiredTemp > -99 && currentTemp > -99 && outSideTemp > -99) {
            const wouldHelp: boolean =
              (desiredTemp < currentTemp && outSideTemp < currentTemp) ||
              (desiredTemp > currentTemp && outSideTemp > currentTemp);
            if (!wouldHelp && this._helpingRoomTemp) {
              const info: string = "Window should be closed, as it doesn't help reaching target temperature.";
              this.log(LogLevel.Info, info);
              if (this._settings.informNotHelping) {
                TelegramService.inform(info);
              }
              this._helpingRoomTemp = false;
            } else if (wouldHelp && !this._helpingRoomTemp) {
              this._helpingRoomTemp = true;
              const info: string = `Das Fenster hilft der Innentemperatur ihr Ziel von ${desiredTemp} zu erreichen. Draußen sind es ${outSideTemp}. Du wirst informiert wenn es nicht mehr hilft.`;
              this.log(LogLevel.Info, info);
              if (this._settings.informIsHelping) {
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
            if (this._settings.informOnOpen) {
              TelegramService.inform(`${this._device.info.room}: ${message}`);
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

  public addHandleChangeCallback(cb: (handleChangeAction: HandleChangeAction) => void): void {
    this._handleChangeCallback.push(cb);
  }

  public dispose(): void {
    if (this._iOpenTimeout) {
      clearInterval(this._iOpenTimeout);
      this._iOpenTimeout = undefined;
    }
  }

  /**
   * Persists the handle sensor state to the persistence layer
   */
  public persist(): void {
    const now: number = Utils.nowMS();
    if (this._lastPersist + 2000 > now) {
      return;
    }
    this.log(LogLevel.Debug, `Persist handle state: ${this.position}`);
    Persistence.dbo?.persistHandleSensor(this._device);
    this._lastPersist = now;
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    this._device.log(level, message, debugType);
  }

  public toJSON(): Partial<HandleSensor> {
    return Utils.jsonFilter(this, this.jsonOmitKeys);
  }
}
