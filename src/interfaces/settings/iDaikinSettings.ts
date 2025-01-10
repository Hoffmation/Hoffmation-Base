/**
 * The configuration for Daikin Air-Conditioning devices (if present)
 */
export interface iDaikinSettings {
  /**
   * Whether the Daikin service should be active.
   */
  active: boolean;
  /**
   * Enables further Logging for Daikin-device in case of akward issues.
   * TODO: Move to Logservice Debugging Type
   */
  activateTracingLogger?: boolean;
  /**
   * Whether all requests to the Daikin devices should be made using GET requests.
   */
  useGetToPost?: boolean;
  /**
   * Whether Room Default Callbacks should be added to start ac on Bottom Right short and stop on long button press.
   * @warning This can collide with Sonos-Control (@see {@link iSonosSettings.buttonBotRightForRadio})
   */
  buttonBotRightForAc?: boolean;
}
