import { LogLevel } from '../enums';
import { Utils } from './utils';
import { MorningVerdict } from './morning-verdict';

/**
 * Runs a decision stage alongside the stage that actually decides, and records what it would have decided.
 *
 * **Why a stage runs here instead of being switched on.** The length of the fitting window has never been
 * measured against recorded data, and on synthetic data the delivered length scores worse than
 * {@link ModelShadow.trivialSuppressSoc} - a single comparison against the state of charge. A stage that may
 * be worse than that comparison must not move an actuator, and one that is better cannot be recognised as
 * better without the comparison being made. After a week of operation the log holds enough lines to read the
 * agreement rate off this plant's real days, which is what turns the open question into a measurement.
 *
 * **One per plant.** The measurement is a count of agreements over a week, so a second shadow beside the first
 * halves the evidence rather than doubling it - and against a second yardstick the two rates cannot even be
 * added. The energy manager holds the plant's one shadow and measures against the plant's one reserve.
 */
export class ModelShadow {
  /**
   * The state of charge in percent at or above which the trivial rule calls the coming morning safe.
   *
   * Deliberately not a setting. It is the yardstick the model is measured against, and a yardstick an
   * installation can turn measures nothing: two plants would report agreement rates that cannot be compared,
   * and a rate could be improved by moving the yardstick rather than the model.
   */
  public static readonly trivialSuppressSoc: number = 55;

  private _agreements: number = 0;
  private _divergences: number = 0;
  /**
   * The last pairing of the two verdicts, which is what the line is throttled on - not the line itself. The
   * line carries the running tally and would therefore differ on every single evaluation.
   */
  private _lastPairing: string | undefined;

  /**
   * Builds a shadow for one stage. It holds no timer and reaches for nothing - it is only written to.
   * @param subject - What the line names the observing stage by, so the operator sees which stage was read.
   * @param log - Where the line goes; the device's own logger, so the line carries the device.
   */
  public constructor(
    private readonly subject: string,
    private readonly log: (level: LogLevel, message: string) => void,
  ) {}

  /**
   * How often the model stage and the trivial rule reached the same verdict so far.
   * @returns The count since this process started.
   */
  public get agreements(): number {
    return this._agreements;
  }

  /**
   * How often the model stage and the trivial rule parted so far.
   * @returns The count since this process started.
   */
  public get divergences(): number {
    return this._divergences;
  }

  /**
   * Records one verdict of the model stage against what the trivial rule would have said, and reports it
   * whenever the pairing of the two changed - the loops this sits in run every few seconds, and a line per
   * pass would bury the change nobody must miss. The running tally rides along on every line, so the newest
   * line alone answers the whole week.
   * @param verdict - What the model stage says about the coming morning.
   * @param currentSoc - The state of charge in percent the trivial rule is evaluated on.
   * @param detail - The numbers the model stage reached its verdict on, for the operator.
   */
  public observe(verdict: MorningVerdict, currentSoc: number, detail: string): void {
    const trivial: MorningVerdict = currentSoc >= ModelShadow.trivialSuppressSoc ? 'holds' : 'misses';
    const agreed: boolean = trivial === verdict;
    if (agreed) {
      this._agreements++;
    } else {
      this._divergences++;
    }
    const pairing: string = `${verdict}/${trivial}`;
    if (pairing === this._lastPairing) {
      return;
    }
    this._lastPairing = pairing;
    this.log(
      LogLevel.Info,
      `Model shadow (${this.subject}): the model says the coming morning ${verdict}, the trivial rule at ` +
        `${ModelShadow.trivialSuppressSoc}% says it ${trivial} --> they ${agreed ? 'agree' : 'part'}; ` +
        `${this._agreements} agreed, ${this._divergences} parted so far; ` +
        `soc ${Utils.round(currentSoc, 2)}%, ${detail}`,
    );
  }
}
