import { iRoomDevice } from './index';
import { SceneSettings } from '../../../models';

// TODO: Add missing Comments
export interface iScene extends iRoomDevice {
  description: string;
  readonly onSceneStart: () => void;
  readonly onSceneEnd: () => void;
  readonly on: boolean;
  readonly automaticEndTimeout: NodeJS.Timeout | null;
  settings: SceneSettings;

  startScene(timeout?: number): void;

  endScene(): void;
}
