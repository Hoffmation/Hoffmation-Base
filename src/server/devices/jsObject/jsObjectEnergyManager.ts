import { IoBrokerBaseDevice } from '../IoBrokerBaseDevice';
import { iEnergyManager } from '../iEnergyManager';
import { iExcessEnergyConsumer } from '../iExcessEnergyConsumer';
import { DeviceType } from '../deviceType';
import { DeviceInfo } from '../DeviceInfo';
import { LogLevel } from '../../../models/logLevel';

export class JsObjectEnergyManager extends IoBrokerBaseDevice implements iEnergyManager {
  public baseConsumption: number = -1;
  public currentProduction: number = -1;
  public excessEnergy: number = -1;
  public excessEnergyConsumerConsumption: number = -1;
  private _excessEnergyConsumer: iExcessEnergyConsumer[] = [];

  public constructor(info: DeviceInfo) {
    super(info, DeviceType.JsEnergyManager);
  }

  public addExcessConsumer(device: iExcessEnergyConsumer): void {
    this._excessEnergyConsumer.push(device);
  }

  public recalculatePowerSharing(): void {
    // TODO Implement
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean, pOverride: boolean = false): void {
    this.log(
      LogLevel.DeepTrace,
      `EnergyManager: ${initial ? 'Initial ' : ''} update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(
        state,
      )}, override: ${pOverride}`,
    );
    switch (idSplit[3]) {
      case 'CurrentExcessEnergy':
        this.log(LogLevel.Trace, `Current excess energy update to ${state.val}`);
        this.setExcessEnergy(state.val as number);
        break;
      case 'CurrentProduction':
        this.log(LogLevel.Trace, `Current Production Update to ${state.val}`);
        this.currentProduction = state.val as number;
        break;
    }
  }

  private setExcessEnergy(val: number) {
    this.excessEnergy = val;
    this.recalculatePowerSharing();
  }
}
