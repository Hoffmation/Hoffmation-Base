import { iProjectedSocBand } from './iProjectedSocBand';

/**
 * Whether the plant expects the coming morning low to stay above the reserve its battery must not fall below.
 *
 * A judgement about the plant, spoken by the plant: the reserve and the sun threshold it is measured against
 * describe the battery, not whoever is asking. What a consumer does with a verdict - suppress, request, ignore -
 * is that consumer's own risk appetite and stays with it.
 */
export interface iMorningReserveVerdict {
  /**
   * True while the coming morning holds the reserve, false while it misses it, undefined while the plant can
   * say neither.
   */
  holds: boolean | undefined;
  /**
   * Whether {@link holds} rests on the plant's measured consumption alone.
   *
   * A verdict that needs the fitted model is reported but carries an unmeasured assumption: the window length
   * of the fit has never been checked against recorded data. Consumers that move something act on the measured
   * verdicts only; the modelled ones exist so an operator can see what the model would have said.
   */
  measured: boolean;
  /** Whether a model was fitted at all when the verdict was formed, regardless of which rung answered */
  modelFitted: boolean;
  /** What made the plant answer this way, as one phrase for the asking consumer's log line */
  reason: string;
  /** The state of charge in percent every projection behind the verdict starts from */
  currentSoc: number;
  /**
   * The projected morning state of charge at both band edges. Both edges collapse onto {@link currentSoc}
   * wherever the verdict needed no band.
   */
  band: iProjectedSocBand;
  /** The minimum morning state of charge in percent the verdict was measured against */
  reserve: number;
  /** How many historical days the model was fitted on; zero while there is none */
  sampleDays: number;
}
