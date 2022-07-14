import { iExcessEnergyConsumer } from '../../devices';
import { ExcessEnergyConsumerSettings, LogLevel } from '../../../models';
import { Utils } from '../utils';
import { ServerLogService } from '../log-service';
import { AcMode } from './ac-mode';

export abstract class AcDevice implements iExcessEnergyConsumer {
  public currentConsumption: number = -1;
  public energyConsumerSettings: ExcessEnergyConsumerSettings = new ExcessEnergyConsumerSettings();
  protected _activatedByExcessEnergy: boolean = false;
  protected _blockAutomaticTurnOnMS: number = -1;

  protected constructor(public name: string, public roomName: string, public ip: string) {}

  public abstract get on(): boolean;

  public isAvailableForExcessEnergy(): boolean {
    return Utils.nowMS() >= this._blockAutomaticTurnOnMS;
  }

  /**
   * Disable automatic Turn-On for given amount of ms and turn off immediately.
   * @param {number} timeout
   */
  public deactivateAutomaticTurnOn(timeout: number = 60 * 60 * 1000): void {
    this._blockAutomaticTurnOnMS = Utils.nowMS() + timeout;
    this.turnOff();
  }

  public abstract setDesiredMode(mode: AcMode): void;

  public abstract turnOn(): void;

  public turnOnForExcessEnergy(): void {
    this._activatedByExcessEnergy = true;
    this.turnOn();
  }

  public abstract turnOff(): void;

  public turnOffDueToMissingEnergy(): void {
    this.turnOff();
  }

  public log(level: LogLevel, message: string): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`);
  }

  public wasActivatedByExcessEnergy(): boolean {
    return this._activatedByExcessEnergy;
  }
}
