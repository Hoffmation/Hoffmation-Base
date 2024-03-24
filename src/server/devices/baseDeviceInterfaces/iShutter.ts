import { Window } from '../groups';
import { iRoomDevice } from './iRoomDevice';
import { ShutterSetLevelCommand, ShutterSettings } from '../../../models';

// TODO: Add missing Comments
export interface iShutter extends iRoomDevice {
  settings: ShutterSettings;
  currentLevel: number;
  desiredWindowShutterLevel: number;
  window: Window | undefined;

  /**
   * Persists the current information of the shutter to the database
   */
  persist(): void;

  /**
   * Sets the level of the shutter
   * @param {ShutterSetLevelCommand} command - The command to execute
   */
  setLevel(command: ShutterSetLevelCommand): void;
}
