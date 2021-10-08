export interface iTemperaturDataPoint {
  _id?: string;
  name: string;
  istTemperatur: number;
  sollTemperatur: number;
  level: number;
  humidity: number;
  date: Date;
}
