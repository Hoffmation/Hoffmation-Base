import { TimeCallback } from '../timeCallback';
import { RoomSetLightTimeBasedCommand } from '../command';

export interface iRoomBase {
  sunriseShutterCallback: TimeCallback | undefined;
  sunsetShutterCallback: TimeCallback | undefined;
  sonnenAufgangLichtCallback: TimeCallback | undefined;
  sonnenUntergangLichtCallback: TimeCallback | undefined;
  skipNextRolloUp: boolean;
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
   * @param {RoomSetLightTimeBasedCommand} c - The command to execute
   */
  setLightTimeBased(c: RoomSetLightTimeBasedCommand): void;

  /**
   * This function checks if it is now light time respecting the room settings, the current time and the daylight hours for this location.
   * @returns {boolean}
   */
  isNowLightTime(): boolean;
}
