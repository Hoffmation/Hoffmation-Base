export class ShutterCalibration {
  constructor(
    public deviceID: string,
    public averageUp: number,
    public counterUp: number,
    public averageDown: number,
    public counterDown: number,
  ) {}
}
