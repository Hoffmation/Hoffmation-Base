import { DeviceType } from '../../deviceType';
import { Res, SonosService, TelegramService, Utils } from '../../../services';
import { LogLevel } from '../../../../models';
import { ZigbeeDevice } from './zigbeeDevice';
import { MagnetPosition } from '../../models';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { iBatteryDevice, iMagnetSensor } from '../../baseDeviceInterfaces';
import { Battery } from '../../sharedFunctions';

export class ZigbeeMagnetContact extends ZigbeeDevice implements iBatteryDevice, iMagnetSensor {
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);
  /** @inheritDoc */
  public position: MagnetPosition = MagnetPosition.closed;
  /** @inheritDoc */
  public telegramOnOpen: boolean = false;
  /** @inheritDoc */
  public speakOnOpen: boolean = false;
  protected _battery: number = -99;
  private _closedCallback: Array<(pValue: boolean) => void> = [];
  private _openCallback: Array<(pValue: boolean) => void> = [];
  private _iOpenTimeout: NodeJS.Timeout | undefined;
  private minutesOpen: number = 0;

  public constructor(pInfo: IoBrokerDeviceInfo, deviceType: DeviceType) {
    super(pInfo, deviceType);
  }

  /** @inheritDoc */
  public get batteryLevel(): number {
    return this.battery.level;
  }

  /** @inheritDoc */
  public addOpenCallback(pCallback: (pValue: boolean) => void): void {
    this._openCallback.push(pCallback);
  }

  /** @inheritDoc */
  public addClosedCallback(pCallback: (pValue: boolean) => void): void {
    this._closedCallback.push(pCallback);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverrride: boolean = false): void {
    super.update(idSplit, state, initial, pOverrride);
    switch (idSplit[3]) {
      case 'battery':
        this.battery.level = state.val as number;
        if (this.batteryLevel < 20) {
          this.log(LogLevel.Warn, 'Das Zigbee Gerät hat unter 20% Batterie.');
        }
        break;
    }
  }

  /** @inheritDoc */
  public dispose(): void {
    if (this._iOpenTimeout) {
      clearInterval(this._iOpenTimeout);
      this._iOpenTimeout = undefined;
    }
    super.dispose();
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
