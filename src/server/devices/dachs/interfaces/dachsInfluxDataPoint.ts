export interface DachsInfluxDataPoint {
  timestamp: Date;
  measurement: string;
  fields: { [key: string]: string | number | boolean };
}
