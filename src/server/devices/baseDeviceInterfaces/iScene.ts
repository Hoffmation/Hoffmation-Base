import { iRoomDevice } from './index';

export interface iScene extends iRoomDevice {
  readonly onSceneStart: () => void;
  readonly onSceneEnd: () => void;
  readonly on: boolean;
  readonly automaticEndTimeout: NodeJS.Timeout | null;

  startScene(timeout?: number): void;

  endScene(): void;
}
