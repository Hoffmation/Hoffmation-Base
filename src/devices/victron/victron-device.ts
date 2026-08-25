import {
  iBatteryDevice,
  iEnergyHistoryOutlook,
  iEnergyManager,
  iExcessEnergyConsumer,
  iJsonOmitKeys,
  iMorningReserveVerdict,
} from '../../interfaces';
import { CommandSource, DeviceCapability, DeviceType, LogLevel, TimeOfDay } from '../../enums';
import { ExcessEnergyConsumerSetStateCommand } from '../../command';
import { VictronDeviceSettings } from '../../settingsObjects';
import { Battery } from '../sharedFunctions';
import { DeviceInfo } from '../DeviceInfo';
import { VictronDeviceData, VictronMqttConnectionOptions, VictronMqttConsumer } from 'victron-mqtt-consumer';
import { EnergyConsumerStateChange, EnergyManagerUtils, Utils } from '../../utils';
import { EnergyCalculation, SunTimeOffsets } from '../../models';
import { Devices } from '../devices';
import { TimeCallbackService, WeatherService } from '../../services';
import { BaseDevice } from '../BaseDevice';
import { iVictronMorningRelease } from './victron-morning-release';

export class VictronDevice extends BaseDevice implements iEnergyManager, iBatteryDevice, iJsonOmitKeys {
  /**
   * The shortest horizon the battery reservation is spread over, in hours. Not a setting: it is a bound on
   * the arithmetic rather than a dial of the plant - see {@link VictronDevice.reserveHorizonHours}.
   */
  private static readonly minimumReserveHorizonHours: number = 0.5;
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
  /** The last reported release state, so the five second loop writes a line on change, not on every pass. */
  private _lastReleaseLine: string | undefined;

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
    if (!this.settings.hasBattery) {
      return false;
    }
    if (this.morningRelease(this.morningOutlook) !== undefined) {
      // Where the plant's measured consumption alone shows the coming morning clears the reserve, that
      // statement decides and the clock does not. The ladder below is a stand-in for the same question, and
      // its sunny morning branch cannot answer the case it was built for: it reads the day's mean cloud
      // cover, which a day that is dull in the morning and clears up at noon never falls below.
      //
      // Only the release direction. Blocking on the model would mean acting on the fitted band, which is
      // exactly what the shadow exists to defer.
      return false;
    }
    const hours: number = new Date().getHours();
    if (hours > 18) {
      return this.batteryLevel < this.settings.minimumNightTimeAcBatteryLevel;
    } else if (hours > 16) {
      return this.batteryLevel < this.settings.minimumTransientTimeAcBatteryLevel;
    } else if (
      hours > 5 &&
      hours < 12 &&
      (WeatherService.todayCloudiness ?? 99) < 40 &&
      WeatherService.todayMaxTemp > 25
    ) {
      // During morning hours battery still might be kinda empty but if it gets sunny again, we should go for ac anyways.
      return this.batteryLevel < this.settings.minimumMorningSunnyDayAcBatteryLevel;
    } else if (hours < 8) {
      return this.batteryLevel < this.settings.minimumNightTimeAcBatteryLevel;
    } else if (hours < 11) {
      return this.batteryLevel < this.settings.minimumTransientTimeAcBatteryLevel;
    }

    return this.batteryLevel < this.settings.minimumDayTimeAcBatteryLevel;
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

  /**
   * Delegated rather than written here, exactly the way this device delegates its consumer switching to
   * {@link EnergyManagerUtils.turnOnAdditionalConsumer}: the answer is about the **plant**, and every energy
   * manager owes the same one - so it is written once and no manager is left with a copy or a stub. What this
   * device keeps for itself is the policy: the rungs, the reservation and the ac block.
   * @inheritDoc
   */
  public get morningOutlook(): iEnergyHistoryOutlook | undefined {
    return EnergyManagerUtils.morningOutlook(this);
  }

  /**
   * Delegated for the same reason {@link morningOutlook} is: the judgement is about the plant's battery and
   * every manager owes the same one. What this device keeps for itself is what it *does* with the verdict -
   * the reservation and the ac block below.
   * @inheritDoc
   */
  public get morningReserveVerdict(): iMorningReserveVerdict | undefined {
    return EnergyManagerUtils.morningReserveVerdict(this, this.morningOutlook);
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

  /** @inheritDoc */
  public getReport(): string {
    const response: string[] = [];
    response.push(`Production: ${this.data.pvInverter.power ?? 0}W`);
    response.push(`Drawing Wattage: ${this.drawingWattage}W`);
    response.push(`Injecting Wattage: ${this.injectingWattage}W`);
    response.push(`Self Consuming Wattage: ${this.selfConsumingWattage}W`);
    response.push(`Battery Level: ${this.batteryLevel}%`);
    return response.join('\n');
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

    // The manager's loop is what drives the plant's one reading, for every consumer of it. Asked, not
    // scheduled: what it costs is decided by the data situation rather than by a setting, and each of the
    // reads behind this throttles itself, so asking on every pass of the five second loop costs the same
    // number of queries as asking once an hour.
    EnergyManagerUtils.refreshEnergyHistory(this);
    // Read once and handed on, rather than each of the three asking again: the projection is arithmetic over
    // one read, and three passes over it would still have to agree with each other.
    const outlook: iEnergyHistoryOutlook | undefined = this.morningOutlook;
    const release: iVictronMorningRelease | undefined = this.morningRelease(outlook);
    this.logMorningRelease(release);
    // Fed from here and from nowhere else. `acBlocked` is a getter anyone may read at any rate, and a tally
    // that counts reads rather than evaluations measures the callers instead of the model.
    EnergyManagerUtils.observeModelShadow(this, outlook, release !== undefined);

    // Step 1: Calculate battery need
    const hoursTilSunset = TimeCallbackService.hoursTilSunset();
    let neededBatteryWattage: number = 0;
    const timeOfDay = TimeCallbackService.dayType(new SunTimeOffsets());
    if (this.settings.hasBattery && timeOfDay !== TimeOfDay.AfterSunset && timeOfDay !== TimeOfDay.Night) {
      if (this.batteryLevel < 0) {
        this.log(LogLevel.Debug, 'No battery data available from Victron device.');
        return;
      }
      neededBatteryWattage = this.neededBatteryWattage(release !== undefined, hoursTilSunset);

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

  /**
   * Rung 1, the only rung of the recorded history that decides: if the state of charge carries past the
   * coming morning low even when no further yield arrives, nothing has to be held back and no consumer has to
   * be kept off.
   *
   * This manager's own policy and rightly here rather than in the shared utils: what a plant does with the
   * outlook is the manager's judgement, and the reservation and ac block it feeds are this device's.
   *
   * Arithmetic over the plant's own measured consumption - no fit, no weights, no window length. That is what
   * separates it from the rung below, which measures against the lower edge of the fitted band and therefore
   * only records (see {@link EnergyManagerUtils.observeModelShadow}).
   * @param outlook - What the plant said, or undefined while it cannot say anything - which includes the
   * absent charge level, so the guard against it stays in the shared utils alone.
   * @returns The release, or undefined while the measured consumption cannot carry it.
   */
  private morningRelease(outlook: iEnergyHistoryOutlook | undefined): iVictronMorningRelease | undefined {
    if (outlook === undefined) {
      // The fallback holds back more, not less.
      return undefined;
    }
    const reserve: number = this.settings.minimumMorningSocReserve;
    const worstCaseLowSoc: number | undefined = outlook.worstCaseLowSoc;
    if (worstCaseLowSoc === undefined || worstCaseLowSoc < reserve) {
      return undefined;
    }
    return {
      reason:
        `worst case low ${Utils.round(worstCaseLowSoc, 2)}% holds the reserve ${reserve}% ` +
        'without any further yield',
    };
  }

  /**
   * How much of the production is held back for the battery.
   *
   * With the release nothing is held back: the coming morning clears the reserve on measured consumption
   * alone. Without it the calculation is the one that was here before - it aims at a full battery by sunset,
   * which over-reserves, and that is what an installation without a usable recorded history keeps.
   * @param released - Whether rung 1 carried the coming morning.
   * @param hoursTilSunset - The horizon the shortfall is spread over.
   * @returns The wattage to hold back.
   */
  private neededBatteryWattage(released: boolean, hoursTilSunset: number): number {
    if (released) {
      return 0;
    }
    const missingShare: number = 1 - this.batteryLevel / 100.0;
    return (missingShare * this.settings.batteryCapacityWattage) / this.reserveHorizonHours(hoursTilSunset);
  }

  /**
   * The horizon the shortfall is actually spread over: the remaining sun hours, but never less than
   * {@link VictronDevice.minimumReserveHorizonHours}.
   *
   * The raw horizon is a difference against the next sunset and runs to zero, while the part of day this
   * calculation is entered under is derived separately from today's sunset plus its own offsets - so the two
   * do not turn at the same instant. In the gap the divisor is first tiny and then negative: a shortfall of a
   * few percent becomes a rate in the megawatt range, at exactly zero an `Infinity` that leaves the process
   * through `toJSON`, and past the turn a *negative* reservation that is added to the excess and offers
   * energy the plant does not have. Every five seconds, and since the horizon is counted in hours rather than
   * minutes, sixty times as large as when this was harmless.
   *
   * The bound is a rate bound, not a schedule: below half an hour of daylight there is nothing left to charge
   * in, so the quotient stops describing a charging rate and only its magnitude still moves. Half an hour
   * caps the reservation at twice the battery capacity per hour - still above anything the plant can take in,
   * therefore never loosening a reservation that was meaningful, while keeping the value finite and signed
   * the way the rest of the calculation assumes.
   * @param hoursTilSunset - The raw remaining sun hours, which may be zero or negative.
   * @returns The horizon to divide by, at least the minimum.
   */
  private reserveHorizonHours(hoursTilSunset: number): number {
    return Math.max(hoursTilSunset, VictronDevice.minimumReserveHorizonHours);
  }

  /**
   * Reports the release whenever it changes, and never otherwise: this runs every five seconds, and a line
   * per pass would bury the change nobody must miss. The very first pass is remembered but not reported while
   * there is no release, so an installation whose recorded history holds nothing stays silent instead of
   * announcing its unchanged behaviour once per start.
   *
   * Named after the reserve rather than after the reservation, because the same release also answers the ac
   * block - and it does so around the clock, while the reservation only applies in daylight.
   * @param release - The release of this pass, or undefined while the measured consumption cannot carry one.
   */
  private logMorningRelease(release: iVictronMorningRelease | undefined): void {
    const line: string =
      release === undefined
        ? 'no model free release, aiming at a full battery by sunset'
        : `released: ${release.reason}`;
    if (line === this._lastReleaseLine) {
      return;
    }
    const first: boolean = this._lastReleaseLine === undefined;
    this._lastReleaseLine = line;
    if (first && release === undefined) {
      return;
    }
    this.log(LogLevel.Info, `Morning reserve decision: ${line}`);
  }

  private turnOnAdditionalConsumer(): void {
    const result = EnergyManagerUtils.turnOnAdditionalConsumer(this._excessEnergyConsumer, this._lastDeviceChange);
    if (result == undefined) {
      this._lastDeviceChange = undefined;
      return;
    }
    if (result.newState) {
      this.blockDeviceChangeTime = Utils.nowMS() + result.device.energySettings.powerReactionTime;
      result.device.setExcessEnergyState(
        new ExcessEnergyConsumerSetStateCommand(
          CommandSource.Automatic,
          true,
          `Energy manager has ${this.excessEnergy}W to spare`,
        ),
      );
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
      result.device.setExcessEnergyState(
        new ExcessEnergyConsumerSetStateCommand(
          CommandSource.Automatic,
          false,
          `Energy manager is short of energy at ${this.excessEnergy}W`,
        ),
      );
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
