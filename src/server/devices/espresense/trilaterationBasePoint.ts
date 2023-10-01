import { TrilaterationRatedCoordinate } from './trilaterationRatedCoordinate';

import { TrilaterationPoint } from './trilaterationPoint';

export class TrilaterationBasePoint {
  public readonly ownPoint: TrilaterationPoint;
  public readonly precalculatedDistances: Map<number, string[]> = new Map<number, string[]>();

  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number,
    public readonly roomName: string,
    private readonly _maximumDistance: number = 8,
  ) {
    this.ownPoint = new TrilaterationPoint(x, y, z, roomName);
  }

  public getRatedCoordinates(distance: number): TrilaterationRatedCoordinate[] {
    const result: TrilaterationRatedCoordinate[] = [];
    this.rateCoordinates(distance, result, 100);
    this.rateCoordinates(distance - 0.5, result, 30);
    this.rateCoordinates(distance + 0.5, result, 30);
    this.rateCoordinates(distance + 1, result, 15);
    this.rateCoordinates(distance - 1, result, 15);
    this.rateCoordinates(distance + 1.5, result, 7.5);
    this.rateCoordinates(distance - 1.5, result, 7.5);
    return result;
  }

  private rateCoordinates(distance: number, result: TrilaterationRatedCoordinate[], rating: number): void {
    const possiblePoints: string[] | undefined = this.precalculatedDistances.get(distance);
    if (possiblePoints !== undefined) {
      for (const point of possiblePoints) {
        result.push(new TrilaterationRatedCoordinate(point, rating));
      }
    }
  }

  public fillMap(points: TrilaterationPoint[]): void {
    for (const point of points) {
      const distance: number = point.getDot5Distance(this.ownPoint);

      if (distance > this._maximumDistance) {
        continue;
      }
      if (!this.precalculatedDistances.has(distance)) {
        this.precalculatedDistances.set(distance, []);
      }
      this.precalculatedDistances.get(distance)?.push(point.coordinateName);
    }
  }
}
