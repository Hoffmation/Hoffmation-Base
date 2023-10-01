import { Utils } from '../../services';

export class TrilaterationPoint {
  public readonly coordinateName: string;

  constructor(
    public x: number,
    public y: number,
    public z: number,
    public roomName: string,
    public matchPoints: number = 0,
  ) {
    this.coordinateName = `${this.x}-${this.y}-${this.z}`;
  }

  public getDistance(other: TrilaterationPoint): number {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2 + (this.z - other.z) ** 2);
  }

  public getDot5Distance(other: TrilaterationPoint): number {
    return Utils.roundDot5(this.getDistance(other));
  }
}
