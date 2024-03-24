export interface iSonosSettings {
  /**
   * Whether the Sonos service should be active.
   */
  active: boolean;
  /**
   * Whether Room Default Callbacks should be added to start Radio on Bottom Right long button press.
   * @warning This can collide with AC-Control (@see {@link iDaikinSettings.buttonBotRightForAc})
   */
  buttonBotRightForRadio?: boolean;
}
