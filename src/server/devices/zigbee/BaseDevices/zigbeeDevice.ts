import { DeviceType } from '../../deviceType';
import { LogLevel } from '../../../../models';
import { IoBrokerBaseDevice } from '../../IoBrokerBaseDevice';
import { IoBrokerDeviceInfo } from '../../IoBrokerDeviceInfo';

export class ZigbeeDevice extends IoBrokerBaseDevice {
  public available: boolean = false;
  public linkQuality: number = 0;
  public voltage: string = '';
  public stateMap: Map<string, ioBroker.State> = new Map<string, ioBroker.State>();

  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
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

    switch (idSplit[3]) {
      case 'available':
        this.available = state.val as boolean;
        if (!this.available) {
          this.log(LogLevel.Debug, `Das Zigbee Gerät ist nicht erreichbar.`);
        }
        break;
      case 'link_quality':
        this.linkQuality = state.val as number;
        if (this.linkQuality < 5) {
          this.log(LogLevel.Debug, `Das Zigbee Gerät hat eine schlechte Verbindung (${this.linkQuality}).`);
        }
        break;

      case 'voltage':
        this.voltage = (state.val as string | number).toString();
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
}
