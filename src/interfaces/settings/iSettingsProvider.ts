import { iConfig } from '../iConfig';
import { HeatingMode } from '../../enums';

/**
 *
 */
export interface iSettingsProvider {
  /**
   *
   */
  settings: iConfig;
  /**
   *
   */
  readonly TelegramActive: boolean;
  /**
   *
   */
  readonly Mp3Active: boolean;
  /**
   *
   */
  readonly heatMode: HeatingMode;
  /**
   *
   */
  readonly latitude: number;
  /**
   *
   */
  readonly longitude: number;

  /**
   *
   */
  initialize(config: iConfig): void;
}
