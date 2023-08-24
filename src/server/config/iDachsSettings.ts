import { DachsClientOptions, InfluxDbConnectionOptions } from '../devices/dachs';

export interface iDachsSettings {
  refreshInterval: number;
  connectionOptions: DachsClientOptions;
  influxDb?: InfluxDbConnectionOptions;
}
