import { DeviceType } from '../../deviceType';
import { LogLevel } from '../../../../models';
import { IoBrokerBaseDevice } from '../../IoBrokerBaseDevice';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';
import { iDisposable, Utils } from '../../../services';

export class ZigbeeDevice extends IoBrokerBaseDevice implements iDisposable {
  protected _available: boolean = false;
  private readonly _deviceQueryId: string;

  public get available(): boolean {
    return this._available;
  }

  protected _linkQuality: number = 0;

  public readonly persistZigbeeInterval: NodeJS.Timeout = Utils.guardedInterval(
    () => {
      this.persistZigbeeDevice();
    },
    15 * 60 * 1000,
    this,
    false,
  );

  public get linkQuality(): number {
    return this._linkQuality;
  }

  private _lastUpdate: Date = new Date(0);

  public get lastUpdate(): Date {
    return this._lastUpdate;
  }

  public stateMap: Map<string, ioBroker.State> = new Map<string, ioBroker.State>();

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
    this._deviceQueryId = `${this.info.fullID}.device_query`;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    this.log(
      LogLevel.DeepTrace,
      `Zigbee: ${initial ? 'Initiales ' : ''}Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`,
    );
    if (!pOverride) {
      this.log(
        LogLevel.Warn,
        `Keine Update Überschreibung:\n\tID: ${idSplit.join('.')}\n\tData: ${JSON.stringify(state)}`,
      );
    }

    const stateLastUpdate: Date = new Date(state.ts);
    if (stateLastUpdate > this._lastUpdate) {
      this._lastUpdate = stateLastUpdate;
    }

    switch (idSplit[3]) {
      case 'available':
        this._available = state.val as boolean;
        if (!this._available) {
          this.log(LogLevel.Debug, `Das Zigbee Gerät ist nicht erreichbar.`);
        }
        break;
      case 'link_quality':
        this._linkQuality = state.val as number;
        if (this._linkQuality < 5) {
          this.log(LogLevel.Debug, `Das Zigbee Gerät hat eine schlechte Verbindung (${this._linkQuality}).`);
        }
        break;
    }
    this.stateMap.set(idSplit[3], state);
    const individualCallbacks: Array<(val: ioBroker.StateValue) => void> | undefined =
      this.individualStateCallbacks.get(idSplit[3]);
    if (individualCallbacks !== undefined) {
      for (const cb of individualCallbacks) {
        cb(state.val);
      }
    }
  }

  public triggerDeviceQuery(): void {
    this.log(LogLevel.Info, `Triggering Device Query`);
    this.setState(this._deviceQueryId, true);
  }

  public dispose(): void {
    clearInterval(this.persistZigbeeInterval);
  }

  public persistZigbeeDevice(): void {
    Utils.dbo?.persistZigbeeDevice(this);
  }
}
