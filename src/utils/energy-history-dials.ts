/**
 * The dials an energy manager has to state before the plant's recorded history can be read at all.
 *
 * Read structurally off the manager's settings, so this stays off any concrete manager class - and required
 * rather than defaulted, because a default here would be a second place stating the delivered numbers. A
 * manager that states none of them says nothing about the coming morning, which is the honest answer for a
 * manager that never described a history to begin with.
 *
 * Not part of the published surface: it describes how the shared implementation reads a manager, not something
 * a consumer of the library implements.
 */
export interface iEnergyHistoryDials {
  /** Length of the sliding window in days that is read, fitted and backfilled */
  historyWindowDays: number;
  /** Below this many usable historical days no model is fitted at all */
  historyMinimumDays: number;
  /** How many residual sigmas each edge of the band lies away from the point estimate */
  historyBandSigma: number;
}
