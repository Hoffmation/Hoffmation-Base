import { GarageDoorOpenerSettings } from '../../../models';
import { iRoomDevice } from './iRoomDevice';

// TODO: Migrate to new Command Structure
export interface iGarageDoorOpener extends iRoomDevice {
  settings: GarageDoorOpenerSettings;

  readonly isClosed: boolean;

  /**
   * Open the garage door
   */
  open(): void;

  /**
   * Close the garage door
   */
  close(): void;

  /**
   * Trigger the garage door.
   * This mostly results in driving the door to the opposite state, but if fired rapidly, it might stop the door in the middle.
   */
  trigger(): void;
}
