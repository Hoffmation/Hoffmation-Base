import { iRoomDevice } from './index';
import { SceneSettings } from '../../../models';

// TODO: Add missing Comments
// TODO: Migrate to new Command Structure
export interface iScene extends iRoomDevice {
  /**
   * The settings for the scene
   */
  settings: SceneSettings;
  /**
   * A description of the scene providing the user with information about what the scene does
   */
  description: string;
  /**
   * Callback to be executed when the scene should be started
   */
  readonly onSceneStart: () => void;
  /**
   * Callback to be executed when the scene should be ended
   */
  readonly onSceneEnd: () => void;
  /**
   * Whether the scene is currently active
   */
  readonly on: boolean;
  /**
   * The timeout for the automatic end of the scene
   */
  readonly automaticEndTimeout: NodeJS.Timeout | null;

  /**
   * Starts the scene for the given duration
   * @param {number} timeout - If set, the scene will end after the given time in ms
   */
  startScene(timeout?: number): void;

  /**
   * Ends the scene --> This also stops the automatic end timeout.
   */
  endScene(): void;
}
