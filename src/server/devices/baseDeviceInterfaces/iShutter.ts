import { Window } from '../groups';
import { iRoomDevice } from './iRoomDevice';

export interface iShutter extends iRoomDevice {
  currentLevel: number;
  desiredWindowShutterLevel: number;
  window: Window | undefined;

  persist(): void;

  setLevel(pPosition: number, initial: boolean, skipOpenWarning?: boolean): void;
}
