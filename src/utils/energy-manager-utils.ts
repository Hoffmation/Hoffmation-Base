import {
  iBatteryDevice,
  iEnergyHistoryOptions,
  iEnergyHistoryOutlook,
  iEnergyManager,
  iExcessEnergyConsumer,
  iMorningReserveVerdict,
  iProjectedSocBand,
} from '../interfaces';
import { EnergyConsumerStateChange } from './energy-consumer-state-change';
import { LogLevel } from '../enums';
import { EnergyHistoryService } from '../services';
import { ModelShadow } from './model-shadow';
import { Utils } from './utils';
import { iEnergyHistoryDials } from './energy-history-dials';
import { iMorningReserveDials } from './morning-reserve-dials';

/**
 * The subject the plant's shadow line names itself by. Deliberately not a manager's name: the record belongs
 * to the plant, and whichever manager it happens to run under, an operator reads one line about one sample.
 */
const MODEL_SHADOW_SUBJECT: string = 'energy manager model rung';

export class EnergyManagerUtils {
  /**
   * The plant's single reading of its recorded history, and the single record of what the model rung would
   * have decided.
   *
   * Static, the way {@link Devices.energymanager} is a single place: there is one energy manager, so there is
   * one history and one shadow. Two of either would mean the paid backfill twice a day and, after a week, two
   * half samples of a measurement that only means anything whole.
   *
   * Held here rather than on a manager so that **every** manager can carry
   * {@link iEnergyManager.morningOutlook} by delegating instead of copying - see
   * {@link EnergyManagerUtils.turnOnAdditionalConsumer}, which is shared for the same reason.
   */
  private static _energyHistory: EnergyHistoryService | undefined;
  private static _modelShadow: ModelShadow | undefined;
  /**
   * Which manager the two above were built for. A different manager is a different plant reading, and
   * carrying the old cache over would answer about the previous manager's battery.
   */
  private static _historyOwner: iEnergyManager | undefined;

  /**
   * Brings the plant's recorded history up to date, as far as anything has gone stale.
   *
   * Meant to be called from the manager's own loop, however fast that runs: each of the reads behind it
   * throttles itself, so calling it every five seconds costs the same number of queries as calling it once an
   * hour. A manager that states no dials reads nothing at all and pays no request quota.
   * @param manager - The plant's energy manager.
   */
  public static refreshEnergyHistory(manager: iEnergyManager): void {
    EnergyManagerUtils.energyHistory(manager)?.refresh();
  }

  /**
   * What the plant's recorded history says about the coming morning low - the shared implementation of
   * {@link iEnergyManager.morningOutlook}, so no manager has to write one of its own.
   *
   * **The one place the marker for "no charge level" is told from a charge level.** Run through the
   * projection the marker moves the whole band, and on a clear morning that band still clears the reserve, so
   * a consumer would be answered at exactly the charge level at which it must not be. A manager without a
   * battery at all lands in the same branch, and rightly: neither offers a starting point for a projection.
   *
   * Pure arithmetic over what {@link refreshEnergyHistory} has already read, so a consumer may ask on every
   * one of its own decisions without costing a query.
   * @param manager - The plant's energy manager.
   * @returns The outlook, or undefined while this manager can say nothing about the coming morning.
   */
  public static morningOutlook(manager: iEnergyManager): iEnergyHistoryOutlook | undefined {
    const currentSoc: number | undefined = (manager as unknown as iBatteryDevice).batteryLevel;
    if (currentSoc === undefined || currentSoc < 0) {
      return undefined;
    }
    return EnergyManagerUtils.energyHistory(manager)?.outlook(currentSoc, new Date());
  }

  /**
   * Whether the plant expects the coming morning to hold its reserve - the shared implementation of
   * {@link iEnergyManager.morningReserveVerdict}.
   *
   * Four rungs, in the order they have to be checked in: the model free bound holds the reserve, the bound
   * misses it and no sun is left to change that, the fitted band falls entirely on one side of the reserve,
   * and no statement. A bound below the reserve while sun is still left is deliberately **not** a "misses":
   * the yield of the remaining day can still carry the morning, and only the model can say whether it will.
   *
   * The first two rungs are arithmetic on the plant's own measured consumption and carry no unmeasured
   * assumption, which is what {@link iMorningReserveVerdict.measured} marks them by. The third rests on a fit
   * whose window length has never been checked against recorded data - it is reported so an operator can read
   * what the model would have said, and consumers that move something leave it alone.
   * @param manager - The plant's energy manager, whose settings state the two thresholds.
   * @param outlook - What the plant said, or undefined while it can say nothing. Handed in rather than read
   * again, so a caller that already read it judges the same moment it read.
   * @returns The verdict, or undefined while there is no outlook or the manager states no thresholds to judge
   * by - a verdict against a guessed reserve would read exactly like one against a stated reserve.
   */
  public static morningReserveVerdict(
    manager: iEnergyManager,
    outlook: iEnergyHistoryOutlook | undefined,
  ): iMorningReserveVerdict | undefined {
    if (outlook === undefined) {
      return undefined;
    }
    const dials: iMorningReserveDials = manager.settings as unknown as iMorningReserveDials;
    const reserve: number | undefined = dials.minimumMorningSocReserve;
    const noSunThresholdHours: number | undefined = dials.noSunThresholdHours;
    if (reserve === undefined || noSunThresholdHours === undefined) {
      return undefined;
    }
    const collapsed: iProjectedSocBand = { lower: outlook.currentSoc, upper: outlook.currentSoc };
    const boundText: string = EnergyManagerUtils.boundText(outlook);
    const worstCaseLowSoc: number | undefined = outlook.worstCaseLowSoc;
    if (worstCaseLowSoc !== undefined) {
      if (worstCaseLowSoc >= reserve) {
        return EnergyManagerUtils.verdict(
          outlook,
          reserve,
          true,
          true,
          collapsed,
          `${boundText} holds the reserve without a model`,
        );
      }
      if (outlook.remainingSunHours < noSunThresholdHours) {
        return EnergyManagerUtils.verdict(
          outlook,
          reserve,
          false,
          true,
          collapsed,
          `${boundText} misses the reserve and only ${Utils.round(outlook.remainingSunHours, 2)}h of sun are left`,
        );
      }
    }

    const band: iProjectedSocBand | undefined = outlook.band;
    if (band === undefined) {
      return EnergyManagerUtils.verdict(
        outlook,
        reserve,
        undefined,
        false,
        collapsed,
        `no statement; ${EnergyManagerUtils.missingModelText(outlook)}; ${boundText}, ` +
          `${Utils.round(outlook.remainingSunHours, 2)}h of sun left`,
      );
    }
    if (band.lower >= reserve) {
      return EnergyManagerUtils.verdict(outlook, reserve, true, false, band, 'the lower band edge holds the reserve');
    }
    if (band.upper < reserve) {
      return EnergyManagerUtils.verdict(outlook, reserve, false, false, band, 'the upper band edge misses the reserve');
    }
    return EnergyManagerUtils.verdict(
      outlook,
      reserve,
      undefined,
      false,
      band,
      `the reserve lies inside the band; ${boundText}`,
    );
  }

  /**
   * Assembles one verdict out of the rung that reached it and the numbers it was reached on.
   * @param outlook - What the plant said.
   * @param reserve - The reserve in percent the rung measured against.
   * @param holds - Whether the coming morning holds, misses, or cannot be judged.
   * @param measured - Whether the rung needed no fitted model.
   * @param band - The projected morning charge level at both edges, collapsed where no band was needed.
   * @param reason - What made this rung answer.
   * @returns The verdict.
   */
  private static verdict(
    outlook: iEnergyHistoryOutlook,
    reserve: number,
    holds: boolean | undefined,
    measured: boolean,
    band: iProjectedSocBand,
    reason: string,
  ): iMorningReserveVerdict {
    return {
      holds,
      measured,
      modelFitted: outlook.basis.modelFitted,
      reason,
      currentSoc: outlook.currentSoc,
      band,
      reserve,
      sampleDays: outlook.sampleDays,
    };
  }

  /**
   * How the model free bound reads in a reason line - either its value or why there is none.
   *
   * The three ways it can be absent look alike from the outside and must not: an operator who reads "no
   * consumption history" while the history is there looks in the wrong place.
   * @param outlook - What the plant said.
   * @returns The text to put into the reason.
   */
  private static boundText(outlook: iEnergyHistoryOutlook): string {
    if (outlook.worstCaseLowSoc !== undefined) {
      return `worst case low ${Utils.round(outlook.worstCaseLowSoc, 2)}%`;
    }
    if (!outlook.basis.batteryCapacityKnown) {
      return 'no battery capacity reported';
    }
    if (outlook.basis.consumptionWindows === 0) {
      return outlook.basis.consumptionReadingsSeen ? 'no usable consumption window' : 'no consumption history';
    }
    return (
      `only ${outlook.basis.consumptionWindows} of ${outlook.basis.requiredConsumptionWindows} ` +
      'required consumption windows'
    );
  }

  /**
   * Why there is no band. Which of the three causes is named decides where the operator looks, and from the
   * outside they look alike.
   * @param outlook - What the plant said.
   * @returns The text to put into the reason.
   */
  private static missingModelText(outlook: iEnergyHistoryOutlook): string {
    if (!outlook.basis.weatherTodayKnown) {
      return 'no weather aggregate for the running day';
    }
    return outlook.basis.consumptionTodayKnown ? 'no fitted model' : 'no consumption reading for the running day';
  }

  /**
   * Records what the rung that rests on the fitted model would have decided, without letting it move
   * anything.
   *
   * The rung rests on a fit whose window length has never been measured against recorded data, and on
   * synthetic data the delivered length scores worse than the trivial rule the line quotes. Reading a week of
   * these lines is what turns that open question into a measurement - see {@link ModelShadow}.
   *
   * Measured against the plant's single reserve, so a week of lines is one sample: two tallies against two
   * thresholds cannot be added.
   * @param manager - The plant's energy manager.
   * @param outlook - What the plant said, or undefined while it can say nothing.
   * @param alreadyDecided - Whether a rung that needs no model already answered this situation. The model
   * rung sits below such a rung, so a verdict taken where the other one decides is not a verdict this rung
   * ever reaches in operation.
   */
  public static observeModelShadow(
    manager: iEnergyManager,
    outlook: iEnergyHistoryOutlook | undefined,
    alreadyDecided: boolean,
  ): void {
    if (alreadyDecided || outlook?.band === undefined) {
      return;
    }
    const dials: iMorningReserveDials = manager.settings as unknown as iMorningReserveDials;
    const reserve: number | undefined = dials.minimumMorningSocReserve;
    const shadow: ModelShadow | undefined = EnergyManagerUtils._modelShadow;
    if (reserve === undefined || shadow === undefined) {
      // No yardstick is no measurement. Nothing is invented in its place: a rate against a guessed threshold
      // would look exactly like a rate against a stated one.
      return;
    }
    shadow.observe(
      outlook.band.lower >= reserve ? 'holds' : 'misses',
      outlook.currentSoc,
      `lower band edge ${Utils.round(outlook.band.lower, 2)}% against reserve ${reserve}% ` +
        `(soc ${Utils.round(outlook.currentSoc, 2)}%, ${outlook.sampleDays} days)`,
    );
  }

  /**
   * The plant's history, built on first use and rebuilt when the manager it belongs to changes.
   * @param manager - The plant's energy manager.
   * @returns The service, or undefined while this manager states no dials to read a history with.
   */
  private static energyHistory(manager: iEnergyManager): EnergyHistoryService | undefined {
    if (EnergyManagerUtils._historyOwner === manager) {
      return EnergyManagerUtils._energyHistory;
    }
    const options: iEnergyHistoryOptions | undefined = EnergyManagerUtils.energyHistoryOptions(manager);
    EnergyManagerUtils._historyOwner = manager;
    EnergyManagerUtils._energyHistory =
      options === undefined ? undefined : new EnergyHistoryService(options, manager.log.bind(manager));
    EnergyManagerUtils._modelShadow =
      options === undefined ? undefined : new ModelShadow(MODEL_SHADOW_SUBJECT, manager.log.bind(manager));
    return EnergyManagerUtils._energyHistory;
  }

  /**
   * A live view of the dials the history is read and fitted with.
   *
   * Getters rather than a snapshot: all three are editable at runtime, and a service holding the values of the
   * moment of construction would answer on a window nobody configured any more.
   * @param manager - The plant's energy manager.
   * @returns The options, or undefined while the manager states none of them.
   */
  private static energyHistoryOptions(manager: iEnergyManager): iEnergyHistoryOptions | undefined {
    const dials: Partial<iEnergyHistoryDials> = manager.settings as unknown as Partial<iEnergyHistoryDials>;
    if (
      dials?.historyWindowDays === undefined ||
      dials.historyMinimumDays === undefined ||
      dials.historyBandSigma === undefined
    ) {
      return undefined;
    }
    const stated: iEnergyHistoryDials = dials as iEnergyHistoryDials;
    return {
      get windowDays(): number {
        return stated.historyWindowDays;
      },
      get minimumModelDays(): number {
        return stated.historyMinimumDays;
      },
      get bandSigma(): number {
        return stated.historyBandSigma;
      },
    };
  }

  public static turnOnAdditionalConsumer(
    excessEnergyConsumer: iExcessEnergyConsumer[],
    lastDeviceChange: EnergyConsumerStateChange | undefined,
  ): void | undefined | EnergyConsumerStateChange {
    const potentialDevices: iExcessEnergyConsumer[] = excessEnergyConsumer.filter((e) => {
      if (e.energySettings.priority === -1 || e.on || !e.isAvailableForExcessEnergy()) {
        return false;
      }
      if (lastDeviceChange?.newState && e === lastDeviceChange.device) {
        e.log(
          LogLevel.Debug,
          'This woould have been a matching energy consumer, but apperantly last turn on failed...',
        );
        return false;
      }
      return true;
    });
    if (potentialDevices.length === 0) {
      if (lastDeviceChange?.newState === true) {
        return undefined;
      }
      return;
    }
    potentialDevices.sort((a, b) => {
      return b.energySettings.priority - a.energySettings.priority;
    });
    return { newState: true, device: potentialDevices[0] };
  }

  public static turnOffAdditionalConsumer(
    excessEnergyConsumer: iExcessEnergyConsumer[],
    lastDeviceChange: EnergyConsumerStateChange | undefined,
  ): void | undefined | EnergyConsumerStateChange {
    const potentialDevices: iExcessEnergyConsumer[] = excessEnergyConsumer.filter((e) => {
      if (e.energySettings.priority === -1 || !e.on) {
        return false;
      }
      if (!e.wasActivatedByExcessEnergy()) {
        e.log(LogLevel.Info, 'This would have been turned off, but was activated manually....');
        return false;
      }
      if (lastDeviceChange?.newState === false && e === lastDeviceChange.device) {
        e.log(
          LogLevel.Debug,
          'This woould have been a matching turn off energy consumer, but apperantly last turn off failed...',
        );
        return false;
      }
      return true;
    });
    if (potentialDevices.length === 0) {
      if (lastDeviceChange?.newState === false) {
        return undefined;
      }
      return;
    }
    potentialDevices.sort((a, b) => {
      return a.energySettings.priority - b.energySettings.priority;
    });
    return { newState: false, device: potentialDevices[0] };
  }
}
