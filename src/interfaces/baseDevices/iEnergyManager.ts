import { iBaseDevice } from './iBaseDevice';
import { iDisposable } from '../iDisposeable';
import { iEnergyHistoryOutlook } from '../iEnergyHistoryOutlook';
import { iExcessEnergyConsumer } from './iExcessEnergyConsumer';
import { iMorningReserveVerdict } from '../iMorningReserveVerdict';

/**
 * Interface for devices that can manage energy consumption and production.
 *
 * For devices with {@link DeviceCapability.energyManager} capability.
 */
export interface iEnergyManager extends iBaseDevice, iDisposable {
  /**
   * The total energy being excessive at the moment of last calculation.
   *
   * For devices with {@link DeviceCapability.energyManager} capability.
   */
  excessEnergy: number;

  /**
   * Whether the Energy Manager actively blocks AC
   */
  readonly acBlocked: boolean;

  /**
   * What the plant's own recorded history says about the coming morning low, or `undefined` while this
   * manager cannot say anything about it - no battery, no stated capacity, or no charge level to project
   * from.
   *
   * **Read, not asked with a charge level.** The level of the plant's battery is the manager's own, and a
   * consumer that handed one in could hand in a different number than the manager itself reads. It is also
   * why the guard against the "no reading" marker of {@link iBatteryDevice.batteryLevel} lives here, once,
   * rather than in every consumer.
   *
   * **Free to read.** This getter must stay pure arithmetic over what was already read, so that a consumer
   * asking on every one of its own decisions costs no query and no request quota. The reading itself is driven
   * separately, from the manager's own loop.
   *
   * **Delegate, do not implement.** `EnergyManagerUtils.morningOutlook(this)` answers it for any manager, and
   * `EnergyManagerUtils.refreshEnergyHistory(this)` in the manager's loop drives the reading - the same pair
   * both managers in this repository use. There is one energy manager per installation, so the shared
   * implementation keeps one reading and one shadow record; a manager that builds its own would pay the
   * bounded weather backfill twice and split that record in half.
   *
   * The answer states facts about the plant and no arithmetic on them. The judgement that goes with it is
   * {@link morningReserveVerdict}; read that one unless you genuinely need the raw quantities.
   */
  readonly morningOutlook: iEnergyHistoryOutlook | undefined;

  /**
   * Whether the plant expects the coming morning to hold the reserve its battery must not fall below, or
   * `undefined` while it can say neither.
   *
   * **The judgement belongs here, not to the asking consumer.** How low the morning may get is a property of
   * the battery, and how little sun still counts as none a property of the plant's photovoltaic - a fuel
   * burning generator and an air conditioner do not want different answers to that. Where they differ is how
   * sure they want to be before they act, and that is {@link iMorningReserveVerdict.measured}: the verdicts
   * that need no fitted model may move something, the modelled ones are reported and left alone.
   *
   * **Free to read**, for the same reason {@link morningOutlook} is - pure arithmetic over what was already
   * read.
   *
   * **Delegate, do not implement.** `EnergyManagerUtils.morningReserveVerdict(this, this.morningOutlook)`
   * answers it for any manager.
   */
  readonly morningReserveVerdict: iMorningReserveVerdict | undefined;

  /**
   * The total wattaage being injected into the grid at the moment of last calculation.
   */
  readonly injectingWattage: number;
  /**
   * The total wattage being drawn from the grid at the moment of last calculation.
   */
  readonly drawingWattage: number;
  /**
   * The total wattage being consumed within the house at the moment of last calculation.
   */
  readonly selfConsumingWattage: number;

  /**
   * Add a device that can consume excess energy
   * @param device - The device that can consume excess energy
   */
  addExcessConsumer(device: iExcessEnergyConsumer): void;

  /**
   * Recalculates power-sharing between devices.
   */
  recalculatePowerSharing(): void;

  /**
   * Generates a report stating used energy and devices that consumed it
   * @returns The report
   */
  getReport(): string;
}
