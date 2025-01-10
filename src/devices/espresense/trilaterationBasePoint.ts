import { TrilaterationPoint } from './trilaterationPoint';
import { iTrilaterationBasePoint, iTrilaterationPoint, iTrilaterationRatedCoordinate } from '../../interfaces';
import { Utils } from '../../utils';
import { TrilaterationRatedCoordinate } from './trilaterationRatedCoordinate';
import { ServerLogService } from '../../logging';
import { LogLevel } from '../../enums';

export class TrilaterationBasePoint implements iTrilaterationBasePoint {
  /**
   * The coordinates of this point in Space
   */
  public readonly ownPoint: iTrilaterationPoint;
  /**
   * A precalculated map of distances to all existing points in the home (@see {@link Trilateration.possiblePoints})
   */
  public readonly precalculatedDistancesMap: Map<number, string[]> = new Map<number, string[]>();

  constructor(
    readonly x: number,
    readonly y: number,
    readonly z: number,
    readonly roomName: string,
    private readonly _maximumDistance: number = 8,
  ) {
    this.ownPoint = new TrilaterationPoint(x, y, z, roomName);
  }

  public getRatedCoordinates(distance: number): iTrilaterationRatedCoordinate[] {
    const roundedDistance: number = Utils.roundDot5(distance);
    const result: iTrilaterationRatedCoordinate[] = [];
    this.rateCoordinates(roundedDistance, result, 100);
    this.rateCoordinates(roundedDistance - 0.5, result, 30);
    this.rateCoordinates(roundedDistance + 0.5, result, 30);
    this.rateCoordinates(roundedDistance + 1, result, 15);
    this.rateCoordinates(roundedDistance - 1, result, 15);
    this.rateCoordinates(roundedDistance + 1.5, result, 7.5);
    this.rateCoordinates(roundedDistance - 1.5, result, 7.5);
    return result;
  }

  public rateCoordinates(distance: number, result: iTrilaterationRatedCoordinate[], rating: number): void {
    const possiblePoints: string[] | undefined = this.precalculatedDistancesMap.get(distance);
    if (possiblePoints !== undefined) {
      for (const point of possiblePoints) {
        result.push(new TrilaterationRatedCoordinate(point, rating));
      }
    }
  }

  public fillMap(points: iTrilaterationPoint[]): void {
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
