import { iBatteryDevice, iEnergyManager, iExcessEnergyConsumer, iJsonOmitKeys } from '../../interfaces';
import { DeviceCapability, DeviceType, LogLevel, TimeOfDay } from '../../enums';
import { VictronDeviceSettings } from '../../settingsObjects';
import { Battery } from '../sharedFunctions';
import { DeviceInfo } from '../DeviceInfo';
import { VictronDeviceData, VictronMqttConnectionOptions, VictronMqttConsumer } from 'victron-mqtt-consumer';
import { EnergyConsumerStateChange, EnergyManagerUtils, Utils } from '../../utils';
import { EnergyCalculation, SunTimeOffsets } from '../../models';
import { Devices } from '../devices';
import { TimeCallbackService } from '../../services';
import { BaseDevice } from '../BaseDevice';

export class VictronDevice extends BaseDevice implements iEnergyManager, iBatteryDevice, iJsonOmitKeys {
  /** @inheritDoc */
  public readonly settings: VictronDeviceSettings;
  /** @inheritDoc */
  public readonly battery: Battery = new Battery(this);
  private readonly _victronConsumer: VictronMqttConsumer;
  private _excessEnergyConsumer: iExcessEnergyConsumer[] = [];
  private blockDeviceChangeTime: number = -1;
  private _lastDeviceChange: undefined | EnergyConsumerStateChange;
  private _iCalculationInterval: NodeJS.Timeout | null = null;
  private _iDatabaseLoggerInterval: NodeJS.Timeout | null = null;
  private _lastPersistenceCalculation: number = Utils.nowMS();
  private _nextPersistEntry: EnergyCalculation;
  private _excessEnergy: number = 0;

  public constructor(opts: VictronMqttConnectionOptions) {
    const info = new DeviceInfo();
    info.fullName = 'Victron Device';
    info.customName = 'Victron';
    info.allDevicesKey = 'victron';
    super(info, DeviceType.Victron);
    this.settings = new VictronDeviceSettings();
    this.deviceCapabilities.push(...[DeviceCapability.energyManager, DeviceCapability.batteryDriven]);
    this.jsonOmitKeys.push(...['_victronConsumer', '_excessEnergyConsumer']);
    Devices.alLDevices['victron'] = this;
    Devices.energymanager = this;
    this._victronConsumer = new VictronMqttConsumer(opts);
    this._iCalculationInterval = Utils.guardedInterval(
      () => {
        if (this.data.battery.soc) {
          this.battery.level = this.data.battery.soc;
        }
        this.calculateExcessEnergy();
      },
      5 * 1000,
      this,
    );
    this._iDatabaseLoggerInterval = Utils.guardedInterval(
      () => {
        this.persist();
      },
      15 * 60 * 1000,
      this,
    );
    this._nextPersistEntry = new EnergyCalculation(Utils.nowMS());
  }

  /** @inheritDoc */
  public get acBlocked(): boolean {
    if (this.settings.hasBattery) {
      const hours: number = new Date().getHours();
      if (hours < 6 || hours > 18) {
        return this.batteryLevel < this.settings.minimumNightTimeAcBatteryLevel;
      }
      if (hours < 10 || hours > 16) {
        return this.batteryLevel < this.settings.minimumTransientTimeAcBatteryLevel;
      }
      return this.batteryLevel < this.settings.minimumDayTimeAcBatteryLevel;
    }
    return false;
  }

  /** @inheritDoc */
  public get batteryLevel(): number {
    const level: number | null = this.data.battery.soc;
    if (level == null) {
      this.log(LogLevel.Debug, 'No battery data available from Victron device.');
      return -1;
    }
    return level;
  }

  public get victronConsumer(): VictronMqttConsumer {
    return this._victronConsumer;
  }

  public get data(): VictronDeviceData {
    return this._victronConsumer.data;
  }

  public get excessEnergy(): number {
    return this._excessEnergy;
  }

  public get name(): string {
    return this.info.customName;
  }

  public get id(): string {
    return this.info.allDevicesKey ?? `victron-${this.info.room}-${this.info.customName}`;
  }

  public get injectingWattage(): number {
    return Math.min(this.victronConsumer.data.grid.power ?? 0, 0) * -1;
  }

  public get drawingWattage(): number {
    return Math.max(this.victronConsumer.data.grid.power ?? 0, 0);
  }

  public get selfConsumingWattage(): number {
    return Math.max(this.victronConsumer.data.system.power ?? 0, 0) - this.drawingWattage;
  }

  public addExcessConsumer(device: iExcessEnergyConsumer): void {
    this._excessEnergyConsumer.push(device);
  }

  /** @inheritDoc */
  public dispose(): void {
    this._victronConsumer.disconnect();
    if (this._iDatabaseLoggerInterval !== null) {
      clearInterval(this._iDatabaseLoggerInterval);
      this._iDatabaseLoggerInterval = null;
    }
    if (this._iCalculationInterval !== null) {
      clearInterval(this._iCalculationInterval);
      this._iCalculationInterval = null;
    }
  }

  public getReport(): string {
    return '';
  }

  public recalculatePowerSharing(): void {
    this.calculateExcessEnergy();
    // As some devices need time to start/shutdown we need to delay turning on/off more devices.
    if (Utils.nowMS() < this.blockDeviceChangeTime) {
      return;
    }
    if (this.excessEnergy > this.settings.excessEnergyTurnOnThreshold) {
      this.turnOnAdditionalConsumer();
    } else if (this.excessEnergy < this.settings.excessEnergyTurnOffThreshold) {
      this.turnOffAdditionalConsumer();
    }
  }

  public toJSON(): Partial<VictronDevice> {
    return {
      ...{
        batteryLevel: this.batteryLevel,
        acBlocked: this.acBlocked,
        excessEnergy: this.excessEnergy,
        drawingWattage: this.drawingWattage,
        injectingWattage: this.injectingWattage,
        selfConsumingWattage: this.selfConsumingWattage,
      },
      ...(super.toJSON() as Partial<VictronDevice>),
    };
  }

  /**
   * Changes the grid set point of the Victron device, to the desired value.
   * @param setPoint - The desired watt point the system should aim for.
   */
  public setGridSetPoint(setPoint: number): void {
    this._victronConsumer.setGridSetPoint(setPoint);
  }

  private calculateExcessEnergy(): void {
    this._excessEnergy = 0;
    if (this.data == undefined) {
      this.log(LogLevel.Debug, 'No data available from Victron device.');
      return;
    }

    // Step 1: Calculate battery need
    const hoursTilSunset = TimeCallbackService.hoursTilSunset();
    let neededBatteryWattage: number = 0;
    const timeOfDay = TimeCallbackService.dayType(new SunTimeOffsets());
    if (this.settings.hasBattery && timeOfDay !== TimeOfDay.AfterSunset && timeOfDay !== TimeOfDay.Night) {
      if (this.batteryLevel < 0) {
        this.log(LogLevel.Debug, 'No battery data available from Victron device.');
        return;
      }
      neededBatteryWattage = ((1 - this.batteryLevel / 100.0) * this.settings.batteryCapacityWattage) / hoursTilSunset;

      // Step 2: Calculate expected solar output
      const solarOutput = this.data.pvInverter.power ?? 0;

      // Step 3: Calculate expected base consumption
      const baseConsumption = this.settings.normalBaseConsumptionWattage;

      // Step 4: Combine to get currently excess energy
      this._excessEnergy = solarOutput - neededBatteryWattage - baseConsumption;
    }

    let isSocTooLow: boolean = false;
    if (this.data.battery.dcPower !== null && this.batteryLevel > -1) {
      if (timeOfDay === TimeOfDay.Night) {
        isSocTooLow = this.batteryLevel < 50;
      } else if (timeOfDay === TimeOfDay.AfterSunset) {
        isSocTooLow = this.batteryLevel < 75;
      } else if (hoursTilSunset > 4) {
        isSocTooLow = this.batteryLevel < 70;
      } else {
        isSocTooLow = this.batteryLevel < 80;
      }
    }
    // Whilst calculated spare energy is more precise, we don't mind using the battery as a buffer, if it is full enough.
    if (this.data.battery.dcPower !== null && this.batteryLevel > -1 && !isSocTooLow) {
      this._excessEnergy = this.settings.maximumBatteryDischargeWattage - Math.max(this.data.battery.dcPower, 0);
    }
    this.calculatePersistenceValues();
  }

  private turnOnAdditionalConsumer(): void {
    const result = EnergyManagerUtils.turnOnAdditionalConsumer(this._excessEnergyConsumer, this._lastDeviceChange);
    if (result == undefined) {
      this._lastDeviceChange = undefined;
      return;
    }
    if (result.newState) {
      this.blockDeviceChangeTime = Utils.nowMS() + result.device.energySettings.powerReactionTime;
      result.device.log(LogLevel.Info, `Turning on, as we have ${this.excessEnergy}W to spare...`);
      result.device.turnOnForExcessEnergy();
      this._lastDeviceChange = result;
    }
  }

  private turnOffAdditionalConsumer(): void {
    const result = EnergyManagerUtils.turnOffAdditionalConsumer(this._excessEnergyConsumer, this._lastDeviceChange);
    if (result == undefined) {
      this._lastDeviceChange = undefined;
      return;
    }
    if (!result.newState) {
      this.blockDeviceChangeTime = Utils.nowMS() + result.device.energySettings.powerReactionTime;
      result.device.log(LogLevel.Info, "Turning off, as we don't have energy to spare...");
      result.device.turnOffDueToMissingEnergy();
      this._lastDeviceChange = result;
    }
  }

  private persist() {
    this._nextPersistEntry.batteryLevel = this.batteryLevel / 100;
    this._nextPersistEntry.batteryStoredKwH =
      (this._nextPersistEntry.batteryLevel * this.settings.batteryCapacityWattage) / 1000;
    const obj: EnergyCalculation = JSON.parse(JSON.stringify(this._nextPersistEntry));
    if (!EnergyCalculation.persist(obj, this._lastPersistenceCalculation, this.log.bind(this))) {
      return;
    }
    this._nextPersistEntry = new EnergyCalculation(this._lastPersistenceCalculation);
  }

  private calculatePersistenceValues(): void {
    const now = Utils.nowMS();
    const duration = now - this._lastPersistenceCalculation;
    this._nextPersistEntry.drawnKwH += Utils.kWh(this.drawingWattage, duration);
    this._nextPersistEntry.injectedKwH += Utils.kWh(this.injectingWattage, duration);
    this._nextPersistEntry.selfConsumedKwH += Utils.kWh(this.selfConsumingWattage, duration);
    this._lastPersistenceCalculation = now;
  }
}
