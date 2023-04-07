import { InfluxDbConnectionOptions } from 'victron-mqtt-consumer/build/models/InfluxDbConnectionOptions';

export interface iVictronSettings {
  host: string;
  influxDb: InfluxDbConnectionOptions;
}
