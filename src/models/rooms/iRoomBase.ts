import { TimeCallback } from '../timeCallback';
import { RoomSetLightTimeBasedCommand } from '../command';

/**
 * This interface represents a room with it's base functionality.
 * Whilst accessing the custom rooms can be beneficial for direct device interaction, this provides interactions to e.g. device groups.
 */
export interface iRoomBase {
  /**
   * The time-callback for controlling shutters at sunrise
   */
  sunriseShutterCallback: TimeCallback | undefined;
  /**
   * The time-callback for controlling shutters at sunset
   */
  sunsetShutterCallback: TimeCallback | undefined;
  /**
   * The time-callback for controlling light at sunrise
   */
  sonnenAufgangLichtCallback: TimeCallback | undefined;
  /**
   * The time-callback for controlling light at sunset
   */
  sonnenUntergangLichtCallback: TimeCallback | undefined;
  /**
   * Whether the next sunset shutter-up should be skipped (afterwards this resets to false)
   */
  skipNextRolloUp: boolean;
  /**
   * The name of the room
   */
  roomName: string;

  /**
   * This function initializes the roomBase object of this room
   */
  initializeBase(): void;

  /**
   * This function stores the roominformation to the database
   */
  persist(): void;

  /**
   * This function recalculates the timecallbacks (e.g. sunset, sunrise handling)
   */
  recalcTimeCallbacks(): void;

  /**
   * This function sets the light in the room based on the command
   * @param c - The command to execute
   */
  setLightTimeBased(c: RoomSetLightTimeBasedCommand): void;

  /**
   * This function checks if it is now light time respecting the room settings, the current time and the daylight hours for this location.
   * @returns
   */
  isNowLightTime(): boolean;
}
