import { DeviceType } from '../deviceType';
import {
  ActuatorSetStateCommand,
  ActuatorSettings,
  CommandSource,
  ExcessEnergyConsumerSettings,
  LogLevel,
} from '../../../models';
import { ZigbeeActuator } from './BaseDevices';
import { iExcessEnergyConsumer } from '../baseDeviceInterfaces';
import { IoBrokerDeviceInfo } from '../IoBrokerDeviceInfo';
import { DeviceCapability } from '../DeviceCapability';
import { iLoadMeter } from '../baseDeviceInterfaces/iLoadMeter';

export class ZigbeeBlitzShp extends ZigbeeActuator implements iExcessEnergyConsumer, iLoadMeter {
  /** @inheritDoc */
  public settings: ActuatorSettings = new ActuatorSettings();
  protected readonly _actuatorOnStateIdState: string;
  private _steckerOn: boolean = false;
  private _current: number = 0;
  private _energy: number = 0;
  private _loadPower: number = 0;
  private readonly _availableForExcessEnergy: boolean = true;
  private _activatedByExcessEnergy: boolean = false;

  public constructor(pInfo: IoBrokerDeviceInfo) {
    super(pInfo, DeviceType.ZigbeeBlitzShp);
    this._actuatorOnStateIdState = `${pInfo.fullID}.state`;
    this.settings.energySettings = new ExcessEnergyConsumerSettings();
    this.deviceCapabilities.push(DeviceCapability.excessEnergyConsumer);
    this.deviceCapabilities.push(DeviceCapability.loadMetering);
  }

  public get current(): number {
    return this._current;
  }

  public get energy(): number {
    return this._energy;
  }

  /** @inheritDoc */
  public get loadPower(): number {
    return this._loadPower;
  }

  /** @inheritDoc */
  public get energySettings(): ExcessEnergyConsumerSettings {
    return this.settings.energySettings!;
  }

  /** @inheritDoc */
  public get currentConsumption(): number {
    return this._loadPower;
  }

  /** @inheritDoc */
  public get on(): boolean {
    return this._steckerOn;
  }

  /** @inheritDoc */
  public isAvailableForExcessEnergy(): boolean {
    return this._availableForExcessEnergy;
  }

  /** @inheritDoc */
  public update(idSplit: string[], state: ioBroker.State, initial: boolean = false): void {
    this.log(LogLevel.DeepTrace, `Stecker Update: ID: ${idSplit.join('.')} JSON: ${JSON.stringify(state)}`);
    super.update(idSplit, state, initial, true);
    switch (idSplit[3]) {
      case 'state':
        const newSteckerOn: boolean = state.val as boolean;
        this.log(
          newSteckerOn !== this._steckerOn ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet Update to ${state.val}`,
        );
        this._steckerOn = newSteckerOn;
        break;
      case 'energy':
        const newEnergy: number = state.val as number;
        this.log(
          newEnergy !== this._energy ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new total consumption: ${state.val}`,
        );
        this._energy = newEnergy;
        break;
      case 'current':
        const newCurrent: number = state.val as number;
        this.log(
          Math.abs(newCurrent - this._current) > 0.25 ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new current: ${state.val}`,
        );
        this._current = newCurrent;
        break;
      case 'load_power':
        const newLoadPower: number = state.val as number;
        this.log(
          Math.abs(newLoadPower - this._loadPower) > 0.25 ? LogLevel.Trace : LogLevel.DeepTrace,
          `Outlet update, new current load power: ${state.val}`,
        );
        this._loadPower = newLoadPower;
        break;
    }
  }

  /** @inheritDoc */
  public turnOnForExcessEnergy(): void {
    this._activatedByExcessEnergy = true;
    this.setActuator(new ActuatorSetStateCommand(CommandSource.Automatic, true, 'Turn on for excess energy'));
  }

  /** @inheritDoc */
  public turnOffDueToMissingEnergy(): void {
    this.setActuator(new ActuatorSetStateCommand(CommandSource.Automatic, false, 'Turn off due to missing energy'));
  }

  /** @inheritDoc */
  public wasActivatedByExcessEnergy(): boolean {
    return this._activatedByExcessEnergy;
  }
}
