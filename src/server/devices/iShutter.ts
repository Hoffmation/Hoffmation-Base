import { Fenster } from './Fenster';
import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';

export interface iShutter extends IoBrokerBaseDevice {
  currentLevel: number;
  desiredFensterLevel: number;
  fenster: Fenster | undefined;
  setLevel(pPosition: number, initial?: boolean, skipOpenWarning?: boolean): void;
}
