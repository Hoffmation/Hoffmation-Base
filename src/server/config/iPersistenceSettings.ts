import { PoolConfig } from 'pg';

export interface iPersistenceSettings {
  postgreSql?: PoolConfig;
}
