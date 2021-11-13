export class CurrentIlluminationDataPoint {
  constructor(
    public roomName: string,
    public deviceID: string,
    public currentIllumination: number,
    public date: Date,
    public lightIsOn: boolean,
  ) {}
}
