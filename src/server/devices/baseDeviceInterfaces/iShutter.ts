import { Fenster } from '../groups';
import { iBaseDevice } from './iBaseDevice';

export interface iShutter extends iBaseDevice {
  currentLevel: number;
  desiredFensterLevel: number;
  fenster: Fenster | undefined;

  setLevel(pPosition: number, initial: boolean, skipOpenWarning?: boolean): void;
}
