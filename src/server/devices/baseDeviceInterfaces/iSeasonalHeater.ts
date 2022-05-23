import { iHeater } from './iHeater';
import { SeasonalHeaterSettings } from '../../../models';

export interface iSeasonalHeater extends iHeater {
  settings: SeasonalHeaterSettings;

  seasonalTurnOff(): void;

  revokeSeasonalTurnOff(): void;
}
