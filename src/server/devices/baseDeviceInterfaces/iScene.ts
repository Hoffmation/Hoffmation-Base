import { iRoomDevice } from './index';
import { SceneSettings } from '../../../models';

// TODO: Add missing Comments
// TODO: Migrate to new Command Structure
export interface iScene extends iRoomDevice {
  description: string;
  readonly onSceneStart: () => void;
  readonly onSceneEnd: () => void;
  readonly on: boolean;
  readonly automaticEndTimeout: NodeJS.Timeout | null;
  settings: SceneSettings;

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
