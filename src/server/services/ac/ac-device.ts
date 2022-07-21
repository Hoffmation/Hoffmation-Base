import { iExcessEnergyConsumer } from '../../devices';
import { ExcessEnergyConsumerSettings, LogLevel } from '../../../models';
import { Utils } from '../utils';
import { ServerLogService } from '../log-service';
import { AcMode } from './ac-mode';
import { AcSettings } from '../../../models/deviceSettings/acSettings';

export abstract class AcDevice implements iExcessEnergyConsumer {
  public currentConsumption: number = -1;
  public energyConsumerSettings: ExcessEnergyConsumerSettings = new ExcessEnergyConsumerSettings();
  public acSettings: AcSettings = new AcSettings();
  protected _activatedByExcessEnergy: boolean = false;
  protected _blockAutomaticTurnOnMS: number = -1;
  private turnOffTimeout: NodeJS.Timeout | null = null;

  protected constructor(public name: string, public roomName: string, public ip: string) {}

  public abstract get on(): boolean;

  public isAvailableForExcessEnergy(): boolean {
    if (Utils.nowMS() < this._blockAutomaticTurnOnMS) {
      return false;
    }
    const minimumStart: Date = Utils.dateByTimeSpan(this.acSettings.minimumHours, this.acSettings.minimumMinutes);
    const maximumEnd: Date = Utils.dateByTimeSpan(this.acSettings.maximumHours, this.acSettings.maximumMinutes);
    const now: Date = new Date();
    return !(now < minimumStart || now > maximumEnd);
  }

  /**
   * Disable automatic Turn-On for given amount of ms and turn off immediately.
   * @param {number} timeout
   */
  public deactivateAutomaticTurnOn(timeout: number = 60 * 60 * 1000): void {
    this._blockAutomaticTurnOnMS = Utils.nowMS() + timeout;
    this.turnOff();
  }

  public abstract setDesiredMode(mode: AcMode, writeToDevice: boolean): void;

  public abstract turnOn(): void;

  public turnOnForExcessEnergy(): void {
    if (this._blockAutomaticTurnOnMS > Utils.nowMS()) {
      return;
    }
    this._activatedByExcessEnergy = true;
    this.turnOn();
    if (this.acSettings.maximumHours < 24 && this.turnOffTimeout === null) {
      this.turnOffTimeout = Utils.guardedTimeout(
        () => {
          if (this._activatedByExcessEnergy) {
            this.turnOff();
          }
        },
        Math.min(
          Utils.dateByTimeSpan(this.acSettings.maximumHours, this.acSettings.maximumMinutes).getTime() - Utils.nowMS(),
          1000,
        ),
        this,
      );
    }
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
