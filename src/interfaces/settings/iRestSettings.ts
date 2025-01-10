/**
 * Interface for the REST settings.
 * This is primarily used to configure the REST service within Hoffmation-Express.
 */
export interface iRestSettings {
  /**
   * Whether the REST service should be active.
   */
  active: boolean;
  /**
   * The port the REST service should listen on.
   */
  port?: number;
}
