import { iTemperaturDataPoint } from "../iTemperaturDataPoint";

export class TemperaturDataPoint implements iTemperaturDataPoint {
  constructor(
    public name: string,
    public istTemperatur: number,
    public sollTemperatur: number,
    public level: number,
    public humidity: number,
    public date: Date,
  ) {}
}
