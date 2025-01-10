import { iDimmableLamp } from './iDimmableLamp';
import { WledSetLightCommand } from '../../command';

/**
 *
 */
export interface iWledDevice extends iDimmableLamp {
  /**
   *
   */
  setWled(c: WledSetLightCommand): void;
}
