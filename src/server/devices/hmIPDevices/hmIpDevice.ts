import { LogLevel } from '../../../models';
import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { DeviceType } from '../deviceType';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';

export class HmIPDevice extends IoBrokerBaseDevice {
  public constructor(pInfo: IoBrokerDeviceInfo, pType: DeviceType) {
    super(pInfo, pType);
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false, pOverride: boolean = false): void {
    if (!pOverride) {
      this.log(LogLevel.Trace, `Keine Update Überschreibung :\n\tID: ${idSplit.join('.')}`);
      this.log(LogLevel.DeepTrace, `Data: ${JSON.stringify(state)}`);
    }

    this.log(
      LogLevel.DeepTrace,
      `Base-Device Update for ${this.info.customName}("${idSplit.join('.')}", ${state}, ${initial}, ${pOverride})`,
    );

    const combinedStateName: string = `${idSplit[3]}.${idSplit[4]}`;
    switch (combinedStateName) {
      case '0.LOW_BAT':
        const newBatLowVal: boolean = state.val as boolean;
        if (newBatLowVal) {
          this.log(LogLevel.Warn, `!!BATTERIE FAST LEER!!`);
        }
        break;
    }
    this.stateMap.set(combinedStateName, state);
    const individualCallbacks: Array<(val: ioBroker.StateValue) => void> | undefined =
      this.individualStateCallbacks.get(combinedStateName);
    if (individualCallbacks !== undefined) {
      for (const cb of individualCallbacks) {
        cb(state.val);
      }
    }
  }
}
