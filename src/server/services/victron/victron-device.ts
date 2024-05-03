import {
  DeviceCapability,
  DeviceInfo,
  Devices,
  DeviceType,
  iBatteryDevice,
  iEnergyManager,
  iExcessEnergyConsumer,
} from '../../devices';
import { EnergyConsumerStateChange, EnergyManagerUtils, Utils } from '../utils';
import {
  BatteryLevelChangeAction,
  EnergyCalculation,
  LogLevel,
  TimeOfDay,
  VictronDeviceSettings,
} from '../../../models';
import { LogDebugType, ServerLogService } from '../log-service';
import { VictronDeviceData, VictronMqttConnectionOptions, VictronMqttConsumer } from 'victron-mqtt-consumer';
import { SunTimeOffsets, TimeCallbackService } from '../time-callback-service';
import { extend } from 'lodash';

export class VictronDevice implements iEnergyManager, iBatteryDevice {
  /** @inheritDoc */
  public readonly deviceCapabilities: DeviceCapability[] = [
    DeviceCapability.energyManager,
    DeviceCapability.batteryDriven,
  ];
  /** @inheritDoc */
  public deviceType: DeviceType = DeviceType.Victron;
  /** @inheritDoc */
  public readonly settings: VictronDeviceSettings;
  protected _info: DeviceInfo;
  private readonly _victronConsumer: VictronMqttConsumer;
  private _excessEnergyConsumer: iExcessEnergyConsumer[] = [];
  private blockDeviceChangeTime: number = -1;
  private _lastDeviceChange: undefined | EnergyConsumerStateChange;
  private _iCalculationInterval: NodeJS.Timeout | null = null;
  private _iDatabaseLoggerInterval: NodeJS.Timeout | null = null;
  private _lastPersistenceCalculation: number = Utils.nowMS();
  private _nextPersistEntry: EnergyCalculation;
  private _lastBatteryPersist: number = 0;
  private _lastBatteryLevel: number = -1;
  private _batteryLevelCallbacks: Array<(action: BatteryLevelChangeAction) => void> = [];
  private _excessEnergy: number = 0;

  public constructor(opts: VictronMqttConnectionOptions) {
    this.settings = new VictronDeviceSettings();
    this._info = new DeviceInfo();
    this._info.fullName = 'Victron Device';
    this._info.customName = 'Victron';
    this._info.allDevicesKey = 'victron';
    Devices.alLDevices['victron'] = this;
    Devices.energymanager = this;
    this.persistDeviceInfo();
    this.loadDeviceSettings();
    this._victronConsumer = new VictronMqttConsumer(opts);
    this._iCalculationInterval = Utils.guardedInterval(
      () => {
        this.checkForBatteryChange();
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
        return this.battery < 70;
      }
      if (hours < 10 || hours > 16) {
        return this.battery < 60;
      }
      return this.battery < 50;
    }
    return false;
  }

  /** @inheritDoc */
  public get lastBatteryPersist(): number {
    return this._lastBatteryPersist;
  }

  public get info(): DeviceInfo {
    return this._info;
  }

  /** @inheritDoc */
  public get battery(): number {
    const level: number | null = this.data.battery.soc;
    if (level == null) {
      this.log(LogLevel.Debug, 'No battery data available from Victron device.');
      return -1;
    }
    return level * 100;
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

  public get customName(): string {
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

  /** @inheritDoc */
  public addBatteryLevelCallback(pCallback: (action: BatteryLevelChangeAction) => void): void {
    this._batteryLevelCallbacks.push(pCallback);
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

  public loadDeviceSettings(): void {
    this.settings.initializeFromDb(this);
  }

  public log(level: LogLevel, message: string, debugType: LogDebugType = LogDebugType.None): void {
    ServerLogService.writeLog(level, `${this.name}: ${message}`, {
      debugType: debugType,
      room: '',
      deviceId: this.name,
      deviceName: this.name,
    });
  }

  public persistDeviceInfo(): void {
    Utils.guardedTimeout(
      () => {
        Utils.dbo?.addDevice(this);
      },
      5000,
      this,
    );
  }

  /** @inheritDoc */
  public persistBatteryDevice(): void {
    const now: number = Utils.nowMS();
    if (this._lastBatteryPersist + 60000 > now) {
      return;
    }
    Utils.dbo?.persistBatteryDevice(this);
    this._lastBatteryPersist = now;
  }

  public toJSON(): Partial<VictronDevice> {
    return extend(Utils.jsonFilter(this, ['_victronConsumer', '_excessEnergyConsumer']), {
      battery: this.battery,
      acBlocked: this.acBlocked,
      excessEnergy: this.excessEnergy,
      drawingWattage: this.drawingWattage,
      injectingWattage: this.injectingWattage,
      selfConsumingWattage: this.selfConsumingWattage,
    });
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
      if (this.battery < 0) {
        this.log(LogLevel.Debug, 'No battery data available from Victron device.');
        return;
      }
      neededBatteryWattage = ((1 - this.battery / 100.0) * this.settings.batteryCapacityWattage) / hoursTilSunset;

      // Step 2: Calculate expected solar output
      const solarOutput = this.data.pvInverter.power ?? 0;

      // Step 3: Calculate expected base consumption
      const baseConsumption = this.settings.normalBaseConsumptionWattage;

      // Step 4: Combine to get currently excess energy
      this._excessEnergy = solarOutput - neededBatteryWattage - baseConsumption;
    }

    let isSocTooLow: boolean = false;
    if (this.data.battery.dcPower !== null && this.battery > -1) {
      if (timeOfDay === TimeOfDay.Night) {
        isSocTooLow = this.battery < 50;
      } else if (timeOfDay === TimeOfDay.AfterSunset) {
        isSocTooLow = this.battery < 75;
      } else if (hoursTilSunset > 4) {
        isSocTooLow = this.battery < 70;
      } else {
        isSocTooLow = this.battery < 80;
      }
    }
    // Whilst calculated spare energy is more precise, we don't mind using the battery as a buffer, if it is full enough.
    if (this.data.battery.dcPower !== null && this.battery > -1 && !isSocTooLow) {
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
    this._nextPersistEntry.batteryLevel = this.battery / 100;
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

  private checkForBatteryChange(): void {
    const newLevel: number = this.battery;
    if (newLevel == this._lastBatteryLevel) {
      return;
    }
    for (const cb of this._batteryLevelCallbacks) {
      cb(new BatteryLevelChangeAction(this));
    }
    this._lastBatteryLevel = newLevel;
  }
}
