import { DachsClientOptions, InfluxDbConnectionOptions } from '../devices/dachs';

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
