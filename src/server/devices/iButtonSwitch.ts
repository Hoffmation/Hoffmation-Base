import { Button } from './button';
import { IoBrokerBaseDevice } from './IoBrokerBaseDevice';

export interface iButtonSwitch extends IoBrokerBaseDevice {
  // Primarily in 4-6 Button switches
  buttonTopLeft: Button | undefined;
  // Primarily in 4-6 Button switches
  buttonTopRight: Button | undefined;

  // Primarily in 6 Button switches
  buttonMidLeft: Button | undefined;
  // Primarily in 6 Button switches
  buttonMidRight: Button | undefined;

  // Primarily in 4-6 Button switches
  buttonBotLeft: Button | undefined;
  // Primarily in 4-6 Button switches
  buttonBotRight: Button | undefined;

  // Primarily in 2 Button switches (top, bot)
  buttonBot: Button | undefined;
  // Primarily in 2 Button switches (top, bot)
  buttonTop: Button | undefined;

  getButtonAssignment(): string;
}
