import { Fenster } from './groups';
import { IBaseDevice } from './iBaseDevice';

export interface iShutter extends IBaseDevice {
  currentLevel: number;
  desiredFensterLevel: number;
  fenster: Fenster | undefined;

  setLevel(pPosition: number, initial: boolean, skipOpenWarning?: boolean): void;
}
