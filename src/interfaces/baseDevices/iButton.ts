import { ButtonPressType } from '../../enums';
import { iButtonCapabilities } from '../iButtonCapabilities';

export interface iButton {
  name: string;
  buttonCapabilities: iButtonCapabilities;

  addCb(buttonType: ButtonPressType, pCallback: (pValue: boolean) => void, description: string): void;

  isPressActive(type: ButtonPressType): boolean;

  getDescription(): string;

  updateState(type: ButtonPressType, pValue: boolean): void;

  toJSON(): Partial<iButton>;

  press(pressType: ButtonPressType): Error | null;
}
