import { iDimmerSettings } from '../deviceSettings';

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
}
