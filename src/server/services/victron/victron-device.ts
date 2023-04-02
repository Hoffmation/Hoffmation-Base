import { VictronDeviceData, VictronMqttConnectionOptions, VictronMqttConsumer } from 'victron-mqtt-consumer';
import { DeviceInfo, Devices, DeviceType, iEnergyManager, iExcessEnergyConsumer } from '../../devices';
import { EnergyManagerUtils, Utils } from '../utils';
import { LogLevel, VictronDeviceSettings } from '../../../models';
import { DeviceCapability } from '../../devices/DeviceCapability';
import { LogDebugType, ServerLogService } from '../log-service';

export class VictronDevice implements iEnergyManager {
  private readonly _victronConsumer: VictronMqttConsumer;
  public readonly deviceCapabilities: DeviceCapability[] = [DeviceCapability.energyManager];
  public deviceType: DeviceType = DeviceType.Victron;
  public readonly settings: VictronDeviceSettings;
  private _excessEnergyConsumer: iExcessEnergyConsumer[] = [];
  private blockDeviceChangeTime: number = -1;
  private _lastDeviceChange: undefined | { newState: boolean; device: iExcessEnergyConsumer };

  public constructor(opts: VictronMqttConnectionOptions) {
    this.settings = new VictronDeviceSettings();
    this._info = new DeviceInfo();
    this._info.fullName = `Victron Device`;
    this._info.customName = `Victron`;
    this._info.allDevicesKey = `victron`;
    Devices.alLDevices[`victron`] = this;
    Devices.energymanager = this;
    this.persistDeviceInfo();
    this.loadDeviceSettings();
    this._victronConsumer = new VictronMqttConsumer(opts);
  }

  protected _info: DeviceInfo;

  public get info(): DeviceInfo {
    return this._info;
  }

  public get victronConsumer(): VictronMqttConsumer {
    return this._victronConsumer;
  }

  public get data(): VictronDeviceData {
    return this._victronConsumer.data;
  }

  private _excessEnergy: number = 0;

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
    return this.info.allDevicesKey ?? `sonos-${this.info.room}-${this.info.customName}`;
  }

  public addExcessConsumer(device: iExcessEnergyConsumer): void {
    this._excessEnergyConsumer.push(device);
  }

  public cleanup(): void {
    this._victronConsumer.disconnect();
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
    if (this.excessEnergy > 400) {
      this.turnOnAdditionalConsumer();
    } else if (this.excessEnergy < 200) {
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

  public toJSON(): Partial<VictronDevice> {
    return Utils.jsonFilter(this, ['_victronConsumer']);
  }

  /**
   * Changes the grid set point of the Victron device, to the desired value.
   * @param {number} setPoint
   */
  public setGridSetPoint(setPoint: number): void {
    this._victronConsumer.setGridSetPoint(setPoint);
  }

  private calculateExcessEnergy(): void {
    this._excessEnergy = 0;
    if (this.data == undefined) {
      this.log(LogLevel.Debug, `No data available from Victron device.`);
      return;
    }

    // Step 1: Calculate battery need
    let neededBatteryWattage: number = 0;
    if (this.settings.hasBattery) {
      if (this.data.battery.soc == null) {
        this.log(LogLevel.Debug, `No battery data available from Victron device.`);
        return;
      }
      neededBatteryWattage = (1 - this.data.battery.soc) * this.settings.batteryCapacityWattage;
    }

    // Step 2: Calculate expected solar output
    const solarOutput = this.data.pvInverter.power ?? 0;

    // Step 3: Calculate expected base consumption
    const baseConsumption = 0;

    // Step 4: Combine to get currently excess energy
    this._excessEnergy = solarOutput - neededBatteryWattage - baseConsumption;
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
      result.device.log(LogLevel.Info, `Turning off, as we don't have energy to spare...`);
      result.device.turnOffDueToMissingEnergy();
      this._lastDeviceChange = result;
    }
  }
}
