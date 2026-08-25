/**
 * The two thresholds the plant judges its coming morning by, read structurally off the energy manager's
 * settings.
 *
 * Both describe the battery and its yield rather than whoever asks about them: "how low may the morning get"
 * is a property of the battery, and "how little sun is no sun" a property of the plant's photovoltaic. Two
 * consumers differ in how sure they want to be before they act, not in what the morning has to hold.
 *
 * Optional, because a manager that states neither cannot judge and none is invented for it - a verdict against
 * a guessed reserve reads exactly like one against a stated reserve. Without them the plant says nothing and
 * every consumer falls back to what needs no history.
 *
 * Not part of the published surface: it describes how the shared implementation reads a manager, not something
 * a consumer of the library implements.
 */
export interface iMorningReserveDials {
  /** The charge level in percent the coming morning's low is expected to stay above */
  minimumMorningSocReserve?: number;
  /** Below this many hours of sun left, no further yield is expected to change the outcome */
  noSunThresholdHours?: number;
}
