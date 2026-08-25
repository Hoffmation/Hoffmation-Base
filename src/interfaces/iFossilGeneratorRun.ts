/**
 * What one fuel burning generator contributed inside an observation window.
 *
 * The correction is additive across these, so a second block heat and power unit or a standby
 * generator is one more entry rather than one more branch. Only fuel burning generators belong in
 * here: the point of the correction is to leave behind what the photovoltaic system alone did, and a
 * generator that runs on sunlight is part of that answer rather than something to subtract from it.
 */
export interface iFossilGeneratorRun {
  /**
   * How long the generator ran inside the window, in milliseconds
   */
  runMilliseconds: number;
  /**
   * Electrical rating of the generator in watt
   */
  ratedElectricalWattage: number;
  /**
   * Share of the generated energy that reached the battery, between 0 and 1
   */
  conversionFactor: number;
}
