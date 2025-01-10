import { iShutterCalibration } from '../../interfaces';

export class ShutterCalibration implements iShutterCalibration {
  constructor(
    public deviceID: string,
    public averageUp: number,
    public counterUp: number,
    public averageDown: number,
    public counterDown: number,
  ) {}
}
