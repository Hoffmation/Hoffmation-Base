/**
 * The part of an energy manager's settings the energy history service needs, read structurally to stay off a
 * concrete manager.
 *
 * All of these describe the **plant**: how much its battery holds, and how good its own recorded data has to
 * be before a statement is built from it. They are read off the manager rather than handed in, because a
 * caller could only fill them by reading this same global place - an option filled that way is a pass-through,
 * and it would let two callers disagree about what counts as a covered day of one and the same plant.
 *
 * Not part of the published surface: it describes how the service reads a manager, not something a consumer of
 * the library implements.
 */
export interface iPlantEnergyDials {
  /** The capacity of the battery in watt hours */
  batteryCapacityWattage?: number;
  /** Share of the expected consumption readings a historical day has to carry to be counted, 0 to 1 */
  historyMinimumDayCoverage?: number;
  /** The quantile of the historical consumption windows the model free bound is calculated with, 0 to 1 */
  historyConsumptionQuantile?: number;
  /** How many usable consumption window sums are needed before that quantile means anything */
  historyMinimumConsumptionDays?: number;
}
