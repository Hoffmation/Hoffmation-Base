import { DeviceType } from '../deviceType';
import { ActuatorSettings, ExcessEnergyConsumerSettings, LogLevel } from '../../../models';
import { ZigbeeActuator } from './BaseDevices';
import { iExcessEnergyConsumer } from '../baseDeviceInterfaces';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';

export class ZigbeeBlitzShp extends ZigbeeActuator implements iExcessEnergyConsumer {
  public steckerOn: boolean = false;
  public current: number = 0;
  public energy: number = 0;
  public loadPower: number = 0;
  public settings: ActuatorSettings = new ActuatorSettings();
  public energyConsumerSettings: ExcessEnergyConsumerSettings = new ExcessEnergyConsumerSettings();
  private readonly _availableForExcessEnergy: boolean = true;
  private _activatedByExcessEnergy: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeBlitzShp, `${pInfo.fullID}.state`);
    this.deviceCapabilities.push(DeviceCapability.excessEnergyConsumer);
  }

  public get currentConsumption(): number {
    return this.loadPower;
  }

  public get on(): boolean {
    return this.steckerOn;
  }

  public isAvailableForExcessEnergy(): boolean {
    return this._availableForExcessEnergy;
  }

  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Stecker Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        const newSteckerOn: boolean = state.val as boolean;
        this.log(
          newSteckerOn !== this.steckerOn ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet Update to ${state.val}`,
        );
        this.steckerOn = newSteckerOn;
        break;
      case 'energy':
        const newEnergy: number = state.val as number;
        this.log(
          newEnergy !== this.energy ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new total consumption: ${state.val}`,
        );
        this.energy = newEnergy;
        break;
      case 'current':
        const newCurrent: number = state.val as number;
        this.log(
          Math.abs(newCurrent - this.current) > 0.25 ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new current: ${state.val}`,
        );
        this.current = newCurrent;
        break;
      case 'load_power':
        const newLoadPower: number = state.val as number;
        this.log(
          Math.abs(newLoadPower - this.loadPower) > 0.25 ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new current load power: ${state.val}`,
        );
        this.loadPower = newLoadPower;
        break;
    }
  }

  public turnOnForExcessEnergy(): void {
    this._activatedByExcessEnergy = true;
    this.setActuator(true);
  }

  public turnOffDueToMissingEnergy(): void {
    this.setActuator(false);
  }

  public wasActivatedByExcessEnergy(): boolean {
    return this._activatedByExcessEnergy;
  }
}
