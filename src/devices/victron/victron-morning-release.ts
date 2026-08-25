/**
 * The one statement the plant's recorded history is allowed to act on in the victron manager: that the coming
 * morning low clears the reserve on measured consumption alone, with no further yield assumed and no model
 * involved.
 *
 * There is no counterpart for "the morning falls short". Saying so needs the fitted model, and the model runs
 * in the shadow; the absent value therefore means the previous calculation applies, which needs nothing from
 * the history.
 *
 * Not part of the published surface: it is how this manager carries its own decision from one private method
 * to the next, not something a consumer of the library reads.
 */
export interface iVictronMorningRelease {
  /** What an operator reads the release by. */
  reason: string;
}
