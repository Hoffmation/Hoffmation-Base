import { iExcessEnergyConsumer } from '../../devices';
import { ExcessEnergyConsumerSettings, LogLevel, RoomBase } from '../../../models';
import { Utils } from '../utils';
import { ServerLogService } from '../log-service';
import { AcMode } from './ac-mode';
import { AcSettings } from '../../../models/deviceSettings/acSettings';

export abstract class AcDevice implements iExcessEnergyConsumer {
  public currentConsumption: number = -1;
  public energyConsumerSettings: ExcessEnergyConsumerSettings = new ExcessEnergyConsumerSettings();
  public acSettings: AcSettings = new AcSettings();
  public room: RoomBase | undefined;
  protected _activatedByExcessEnergy: boolean = false;
  protected _blockAutomaticTurnOnMS: number = -1;

  protected constructor(public name: string, public roomName: string, public ip: string) {
    Utils.guardedInterval(this.automaticCheck, 60000, this, true);
  }

  public abstract get on(): boolean;

  public isAvailableForExcessEnergy(): boolean {
    if (Utils.nowMS() < this._blockAutomaticTurnOnMS) {
      return false;
    }
    const minimumStart: Date = Utils.dateByTimeSpan(this.acSettings.minimumHours, this.acSettings.minimumMinutes);
    const maximumEnd: Date = Utils.dateByTimeSpan(this.acSettings.maximumHours, this.acSettings.maximumMinutes);
    const now: Date = new Date();
    if (now < minimumStart || now > maximumEnd) {
      return false;
    }
    return this.calculateDesiredMode() !== AcMode.Off;
  }

  public calculateDesiredMode(): AcMode {
    const temp: number | undefined = this.room?.HeatGroup?.currentTemp;
    if (temp === undefined) {
      this.log(LogLevel.Warn, `Can't calculate AC Mode as we have no room temperature`);
      return AcMode.Off;
    }

    if (temp > this.acSettings.stopCoolingTemperatur) {
      return AcMode.Cooling;
    }
    if (temp < this.acSettings.stopHeatingTemperatur && this.acSettings.heatingAllowed) {
      return AcMode.Heating;
    }
    return AcMode.Off;
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
    this.setDesiredMode(this.calculateDesiredMode(), false);
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

  private automaticCheck(): void {
    if (!this.on) {
      return;
    }
    const desiredMode: AcMode = this.calculateDesiredMode();
    const maximumEnd: Date = Utils.dateByTimeSpan(this.acSettings.maximumHours, this.acSettings.maximumMinutes);
    const now: Date = new Date();
    if (now > maximumEnd || (this._activatedByExcessEnergy && desiredMode == AcMode.Off)) {
      this.turnOff();
      return;
    }
  }
}
