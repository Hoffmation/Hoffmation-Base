import { DeviceSettings } from './deviceSettings';
import { Utils } from '../../utils';
import { ServerLogService } from '../../logging';
import { LogLevel } from '../../enums';

/**
 * Takes over a setting that has to lie between 0 and 1, or keeps the value in force and reports the refusal.
 *
 * Kept rather than clamped, and that is the whole decision: 90 written for "90 percent" clamps to 1 and turns
 * a dial nobody touched to its extreme - a coverage demanding every single reading of a day, a quantile at
 * the maximum of the sample, a conversion factor that loses nothing at all. Each of those is a plausible
 * looking number, and a plausible looking number is exactly the one an operator never goes looking for. The
 * value in force is the documented default, the refused input is named in the log, and no unusable input
 * quietly becomes a different plant.
 *
 * Deliberately loud rather than thrown: a settings file is read at startup, and one mistyped share must not
 * cost the whole installation its automation.
 *
 * Lives here rather than on the settings base class only because of how this change was cut; it is shared by
 * every settings class that carries a share and belongs next to them.
 * @param name - The setting, so the log line names what was refused
 * @param value - What was handed in, or undefined when the caller set nothing
 * @param current - The value in force, kept whenever the input is unusable
 * @returns - The value to use from now on
 */
export function acceptedShare(name: string, value: number | undefined, current: number): number {
  if (value === undefined) {
    return current;
  }
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    ServerLogService.writeLog(
      LogLevel.Warn,
      `Settings: ${name} of ${value} lies outside 0..1 --> refused, ${current} stays in force`,
    );
    return current;
  }
  return value;
}

/**
 * Reports a history window shorter than the number of days the fit demands before it produces anything.
 *
 * Reported rather than corrected: which of the two numbers the operator meant cannot be told from here, and
 * the combination is not dangerous - the fit simply never yields a band and the decision falls back to the
 * rung that needs no history. Only nobody would ever see why it never got past that rung.
 * @param windowDays - The length of the sliding window in days
 * @param minimumDays - How many usable days the fit demands
 */
export function reportImpossibleWindow(windowDays: number, minimumDays: number): void {
  if (windowDays >= minimumDays) {
    return;
  }
  ServerLogService.writeLog(
    LogLevel.Warn,
    `Settings: historyWindowDays of ${windowDays} is shorter than historyMinimumDays of ${minimumDays} ` +
      '--> the fit can never gather enough days and no band will be produced',
  );
}

export class VictronDeviceSettings extends DeviceSettings {
  /**
   * The default time interval in minutes for battery-change reporting regardless of battery level.
   * -1 = disabled
   */
  public batteryReportingInterval: number = 30;
  /**
   * The maximum wattage that the battery can deliver to the house
   * @default 1700
   */
  public maxBatteryLoadWattage: number = 1700;
  /**
   * If the system has a battery
   * @default true
   */
  public hasBattery: boolean = true;

  /**
   * The minimum battery level for nighttime AC usage allowance
   */
  public minimumNightTimeAcBatteryLevel: number = 80;
  /**
   * The minimum battery level for early morning or evening hours AC usage allowance
   */
  public minimumTransientTimeAcBatteryLevel: number = 70;

  /**
   * The minimum battery level at which the system should be allowed to use AC
   */
  public minimumDayTimeAcBatteryLevel: number = 60;
  /**
   * The minimum battery level at which the system should be allowed to use AC on expectetly hot/sunny days mornings
   * @type {number}
   */
  public minimumMorningSunnyDayAcBatteryLevel: number = 30;
  /**
   * If the system has a grid
   * @default true
   */
  public hasGrid: boolean = true;
  /**
   * If the system has solar panels
   * @default true
   */
  public hasSolar: boolean = true;
  /**
   * The capacity of the battery in watt-hours
   * @default 10000
   */
  public batteryCapacityWattage: number = 10000;
  /**
   * The share of the expected consumption readings a recorded day has to carry before its window sum is
   * counted at all, between 0 and 1.
   *
   * A dial of the plant rather than of whoever reads its history: an incompletely covered night adds up to
   * too little, therefore looks like a frugal night, pulls the quantile down and makes the resulting bound
   * too optimistic - and two readers who disagree about what counts as a covered day of the same plant would
   * be answering about two different plants. Deliberately strict, because a bound that is too optimistic
   * suppresses, and a wrong suppression has no way back: the morning is simply below the reserve by then.
   * @default 0.9
   */
  public historyMinimumDayCoverage: number = 0.9;
  /**
   * The quantile of the recorded consumption windows a model free bound is calculated with, between 0 and 1.
   * An upper quantile rather than the median, because the bound has to hold on a heavy night and not on half
   * of them.
   * @default 0.9
   */
  public historyConsumptionQuantile: number = 0.9;
  /**
   * How many usable consumption window sums are needed before that quantile means anything at all.
   *
   * An upper quantile of one night is that night, and of two nights it sits all but on their maximum - so a
   * single quiet night would yield a high bound and a suppression with nothing behind it. Deliberately its
   * own number rather than a shared minimum with the day count a model fit needs: that one protects the
   * stability of a fit, this one protects the meaning of a quantile.
   * @default 10
   */
  public historyMinimumConsumptionDays: number = 10;
  /**
   * The state of charge in percent the coming morning's low is expected to stay above.
   *
   * A property of the battery and therefore stated once, here: "how low may the morning get" is the same
   * question whichever device asks it, and two numbers for one battery would let a plant judge one and the
   * same morning twice. Where consumers legitimately differ is how sure they want to be before they act, and
   * that is the split between the verdicts that need no model and the ones that do - see
   * {@link iMorningReserveVerdict.measured}, not a second reserve.
   *
   * It is also the threshold the model shadow measures against, and a shadow whose sample is split across two
   * thresholds measures nothing - see {@link ModelShadow}.
   * @default 20
   */
  public minimumMorningSocReserve: number = 20;
  /**
   * Below this many remaining sun hours no further photovoltaic yield is expected to change the coming
   * morning.
   *
   * Plant wide next to the reserve, because it describes this installation's photovoltaic rather than whoever
   * asks: the last half hour before sunset yields the same nothing for every consumer.
   * @default 0.5
   */
  public noSunThresholdHours: number = 0.5;
  /**
   * The length of the sliding window in days the history is read and fitted from. Older days describe a
   * differently grown installation and are deliberately left out.
   *
   * Stated once for the whole plant, here, because it says how much of the recorded data is telling enough to
   * answer with - a property of that data and not of whoever asks. Every consumer of the history asks the
   * same question, and a second window meant a second read and a second paid backfill of the same days.
   *
   * The default is a starting point, not a finding: it has not been established against recorded data. In the
   * back test the estimate gets monotonically worse the longer the window is, and a window of sixty days
   * already scores worse than the trivial threshold rule. Treat this value as unproven until a run against
   * the recorded history has produced a number.
   * @default 90
   */
  public historyWindowDays: number = 90;
  /**
   * How many usable historical days are needed before the weights are fitted at all. Below this number no
   * band is produced at all and every consumer falls back to what needs no history.
   *
   * Plant wide for the same reason {@link historyWindowDays} is: how much evidence makes a fit meaningful is a
   * property of the recorded data.
   * @default 15
   */
  public historyMinimumDays: number = 15;
  /**
   * How many standard deviations of the residuals each band edge lies away from the point estimate.
   *
   * Plant wide, because the band is part of the answer rather than of the judgement made on it. A consumer
   * that one day wants edges of its own width reads {@link iEnergyHistoryOutlook.residualSigma} and forms
   * them; it does not fit a second model.
   * @default 1.0
   */
  public historyBandSigma: number = 1.0;
  /**
   * The normal base consumption of the house in wattage
   * @default 600
   */
  public normalBaseConsumptionWattage: number = 600;
  /**
   * The maximum wattage that the battery can deliver to the house
   * @default 3000
   */
  public maximumBatteryDischargeWattage: number = 3000;
  /**
   * The threshold (in Watts) at which the system should turn on excess energy consumers
   */
  public excessEnergyTurnOnThreshold: number = 500;
  /**
   * The threshold (in Watts) at which the system should turn off excess energy consumers
   */
  public excessEnergyTurnOffThreshold: number = 50;

  public fromPartialObject(data: Partial<VictronDeviceSettings>): void {
    this.maxBatteryLoadWattage = data.maxBatteryLoadWattage ?? this.maxBatteryLoadWattage;
    this.batteryReportingInterval = data.batteryReportingInterval ?? this.batteryReportingInterval;
    this.hasBattery = data.hasBattery ?? this.hasBattery;
    this.hasGrid = data.hasGrid ?? this.hasGrid;
    this.hasSolar = data.hasSolar ?? this.hasSolar;
    this.minimumNightTimeAcBatteryLevel = data.minimumNightTimeAcBatteryLevel ?? this.minimumNightTimeAcBatteryLevel;
    this.minimumMorningSunnyDayAcBatteryLevel =
      data.minimumMorningSunnyDayAcBatteryLevel ?? this.minimumMorningSunnyDayAcBatteryLevel;
    this.minimumTransientTimeAcBatteryLevel =
      data.minimumTransientTimeAcBatteryLevel ?? this.minimumTransientTimeAcBatteryLevel;
    this.minimumDayTimeAcBatteryLevel = data.minimumDayTimeAcBatteryLevel ?? this.minimumDayTimeAcBatteryLevel;
    this.batteryCapacityWattage = data.batteryCapacityWattage ?? this.batteryCapacityWattage;
    this.historyMinimumDayCoverage = acceptedShare(
      'historyMinimumDayCoverage',
      data.historyMinimumDayCoverage,
      this.historyMinimumDayCoverage,
    );
    this.historyConsumptionQuantile = acceptedShare(
      'historyConsumptionQuantile',
      data.historyConsumptionQuantile,
      this.historyConsumptionQuantile,
    );
    this.historyMinimumConsumptionDays = data.historyMinimumConsumptionDays ?? this.historyMinimumConsumptionDays;
    this.minimumMorningSocReserve = data.minimumMorningSocReserve ?? this.minimumMorningSocReserve;
    this.noSunThresholdHours = data.noSunThresholdHours ?? this.noSunThresholdHours;
    this.historyWindowDays = data.historyWindowDays ?? this.historyWindowDays;
    this.historyMinimumDays = data.historyMinimumDays ?? this.historyMinimumDays;
    this.historyBandSigma = data.historyBandSigma ?? this.historyBandSigma;
    this.normalBaseConsumptionWattage = data.normalBaseConsumptionWattage ?? this.normalBaseConsumptionWattage;
    this.maximumBatteryDischargeWattage = data.maximumBatteryDischargeWattage ?? this.maximumBatteryDischargeWattage;
    this.excessEnergyTurnOnThreshold = data.excessEnergyTurnOnThreshold ?? this.excessEnergyTurnOnThreshold;
    this.excessEnergyTurnOffThreshold = data.excessEnergyTurnOffThreshold ?? this.excessEnergyTurnOffThreshold;
    // After both are taken over, because the two only contradict each other as a pair.
    reportImpossibleWindow(this.historyWindowDays, this.historyMinimumDays);
    super.fromPartialObject(data);
  }

  public toJSON(): Partial<VictronDeviceSettings> {
    return Utils.jsonFilter(this);
  }
}
