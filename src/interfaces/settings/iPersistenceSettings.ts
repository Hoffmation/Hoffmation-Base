import { PoolConfig } from 'pg';

/**
 * The settings for the persistence system.
 * The persistence system is used mainly for following things:
 * 1. To persists settings/configuration
 * 2. To persists the state of devices (e.g. to remember the last state of a light)
 * 3. To persists device data for Statistics
 */
export interface iPersistenceSettings {
  /**
   * PostgreSql configuration
   */
  postgreSql?: PoolConfig;
}
