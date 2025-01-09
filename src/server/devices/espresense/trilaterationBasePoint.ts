import { TrilaterationRatedCoordinate } from './trilaterationRatedCoordinate.js';

import { TrilaterationPoint } from './trilaterationPoint.js';
import { ServerLogService, Utils } from '../../services/index.js';
import { LogLevel } from '../../../models/index.js';

export class TrilaterationBasePoint {
  /**
   * The coordinates of this point in Space
   */
  public readonly ownPoint: TrilaterationPoint;
  /**
   * A precalculated map of distances to all existing points in the home (@see {@link Trilateration.possiblePoints})
   */
  public readonly precalculatedDistancesMap: Map<number, string[]> = new Map<number, string[]>();

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
    const roundedDistance: number = Utils.roundDot5(distance);
    const result: TrilaterationRatedCoordinate[] = [];
    this.rateCoordinates(roundedDistance, result, 100);
    this.rateCoordinates(roundedDistance - 0.5, result, 30);
    this.rateCoordinates(roundedDistance + 0.5, result, 30);
    this.rateCoordinates(roundedDistance + 1, result, 15);
    this.rateCoordinates(roundedDistance - 1, result, 15);
    this.rateCoordinates(roundedDistance + 1.5, result, 7.5);
    this.rateCoordinates(roundedDistance - 1.5, result, 7.5);
    return result;
  }

  private rateCoordinates(distance: number, result: TrilaterationRatedCoordinate[], rating: number): void {
    const possiblePoints: string[] | undefined = this.precalculatedDistancesMap.get(distance);
    if (possiblePoints !== undefined) {
      for (const point of possiblePoints) {
        result.push(new TrilaterationRatedCoordinate(point, rating));
      }
    }
  }

  public fillMap(points: TrilaterationPoint[]): void {
    let count: number = 0;
    for (const point of points) {
      const distance: number = point.getDot5Distance(this.ownPoint);

      if (distance > this._maximumDistance) {
        continue;
      }
      count++;
      const distancePoints = this.precalculatedDistancesMap.get(distance) ?? [];
      distancePoints.push(point.coordinateName);
      this.precalculatedDistancesMap.set(distance, distancePoints);
    }
    ServerLogService.writeLog(LogLevel.Info, `Filled ${count} distances for Trilateration in room: ${this.roomName}`);
  }
}
