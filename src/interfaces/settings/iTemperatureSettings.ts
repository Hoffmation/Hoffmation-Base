import { iDaytime } from '../iDaytime';

export interface iTemperatureSettings {
  start: iDaytime;
  end: iDaytime;
  temperature: number;
  name: string;
  active: boolean;
}
