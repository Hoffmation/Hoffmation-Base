import { iRoomDevice } from './index';
import { SceneSettings } from '../../../models/deviceSettings/sceneSettings';

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
