import { DaikinAC } from 'daikin-controller';

export class OwnDaikinDevice {
  public constructor(
    public name: string,
    public roomName: string,
    public ip: string,
    public device: DaikinAC | undefined,
  ) {}
}
