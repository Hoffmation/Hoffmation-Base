import { Fenster } from '../groups';
import { iRoomDevice } from './iRoomDevice';

export interface iShutter extends iRoomDevice {
  currentLevel: number;
  desiredFensterLevel: number;
  fenster: Fenster | undefined;

  persist(): void;

  setLevel(pPosition: number, initial: boolean, skipOpenWarning?: boolean): void;
}
