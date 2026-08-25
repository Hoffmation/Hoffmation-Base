/**
 * How the plant's recorded history is read, fitted and reported on.
 *
 * **All three describe the plant, not whoever asks**: every consumer asks the same question - where the state
 * of charge bottoms out before the coming morning - and how much history is telling enough to answer it is a
 * property of the recorded data. A second bundle would mean a second read, a second paid backfill and two half
 * samples in the shadow record.
 *
 * Handed in rather than read off a global, so the reading service stays off any concrete energy manager class
 * and can be built in isolation. **Every field is read anew on each use**: the owner hands in a live view of
 * its settings rather than a snapshot, because all three are editable at runtime.
 *
 * The rest of what describes the plant lives elsewhere: how good its recorded data has to be is stated by the
 * energy manager, and its fuel burning generators announce themselves as devices - see
 * {@link Devices.fossilGenerators}.
 */
export interface iEnergyHistoryOptions {
  /** Length of the sliding window in days that is read, fitted and backfilled. */
  windowDays: number;
  /**
   * Below this many usable historical days no model is fitted at all.
   *
   * The floor below which a fit is not merely uncertain but meaningless is plant wide and sits in the
   * arithmetic itself, which raises any lower number to it - this dial can only ask for more than that.
   */
  minimumModelDays: number;
  /** How many residual sigmas each edge of the band lies away from the point estimate. */
  bandSigma: number;
}
