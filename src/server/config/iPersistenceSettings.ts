import { PoolConfig } from 'pg';

/**
 * Persistence settings
 * Currently only PostgreSql is supported
 */
export interface iPersistenceSettings {
  /**
   * PostgreSql configuration
   */
  postgreSql?: PoolConfig;
}
