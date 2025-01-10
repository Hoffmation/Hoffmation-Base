import { iDimmerSettings } from '../deviceSettings';
import { LampSetTimeBasedCommand, WledSetLightCommand } from '../../command';

/**
 *
 */
export interface iWledSettings extends iDimmerSettings {
  /**
   *
   */
  dawnPreset?: number;
  /**
   *
   */
  dayPreset?: number;
  /**
   *
   */
  duskPreset?: number;
  /**
   *
   */
  nightPreset?: number;

  /**
   *
   */
  buildWledSetLightCommand(c: LampSetTimeBasedCommand): WledSetLightCommand;
}
