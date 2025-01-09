import { DachsClientOptions, InfluxDbConnectionOptions } from '../devices/dachs/interfaces/index.js';

/**
 * The configuration for the Dachs CHP (if present)
 * CHP = Combined Heat and Power (in german Block-Heiz-Kraftwerk)
 */
export interface iDachsSettings {
  /**
   * The interval in milli-seconds in which the Dachs client should refresh its data.
   */
  refreshInterval: number;
  /**
   * The connection options for the Dachs client.
   */
  connectionOptions: DachsClientOptions;
  /**
   * If provided, the Dachs client will write data to this InfluxDB.
   */
  influxDb?: InfluxDbConnectionOptions;
  /**
   * The room name the Dachs device is located in.
   */
  roomName: string;
}
