/**
 * An object which defines certain keys to append to the JSON output
 */
export interface iJsonCustomPrepend {
  /**
   * List of keys to append
   */
  readonly customPrepend: () => Partial<unknown>;
}
