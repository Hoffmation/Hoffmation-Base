import { TrilaterationBasePoint } from './trilaterationBasePoint';
import { TrilaterationPoint } from './trilaterationPoint';
import { TrilaterationRatedCoordinate } from './trilaterationRatedCoordinate';
import { TrilaterationPointDistance } from './trilaterationPointDistance';

export class Trilateration {
  public static readonly basePoints: TrilaterationBasePoint[] = [];
  private static _possiblePoints: TrilaterationPoint[] = [];

  public static initialize(possiblePoints: TrilaterationPoint[]): void {
    this._possiblePoints = possiblePoints;
    for (const basePoint of this.basePoints) {
      basePoint.fillMap(this._possiblePoints);
    }
  }

  public static getBestMatch(distances: TrilaterationPointDistance[]): TrilaterationPoint | undefined {
    const bestRatedCoordinate = this.getBestRatedCoordinate(distances);
    if (bestRatedCoordinate === undefined) {
      return undefined;
    }
    return this._possiblePoints.find((point) => point.coordinateName === bestRatedCoordinate?.coordinateName);
  }

  private static getBestRatedCoordinate(
    distances: TrilaterationPointDistance[],
  ): TrilaterationRatedCoordinate | undefined {
    const allRatedCoordinates: Map<string, TrilaterationRatedCoordinate> = new Map<
      string,
      TrilaterationRatedCoordinate
    >();
    let bestRatedCoordinate: TrilaterationRatedCoordinate | undefined;
    for (const dist of distances) {
      const point = this.basePoints.find((basePoint) => basePoint.ownPoint.coordinateName === dist.pointName);
      if (point === undefined) {
        continue;
      }
      const ratedCoordinates = point.getRatedCoordinates(dist.distance);
      for (const ratedCoordinate of ratedCoordinates) {
        const existingCoordinate = allRatedCoordinates.get(ratedCoordinate.coordinateName);
        if (existingCoordinate === undefined) {
          allRatedCoordinates.set(ratedCoordinate.coordinateName, ratedCoordinate);
          continue;
        }

        existingCoordinate.rating += ratedCoordinate.rating;
        existingCoordinate.matchCount++;
        if (
          bestRatedCoordinate === undefined ||
          bestRatedCoordinate.matchCount < existingCoordinate.matchCount ||
          (bestRatedCoordinate.matchCount === existingCoordinate.matchCount &&
            bestRatedCoordinate.rating < existingCoordinate.rating)
        ) {
          bestRatedCoordinate = existingCoordinate;
        }
      }
    }
    if (bestRatedCoordinate === undefined) {
      // Falls es keine Übereinstimmung gibt, wird die höchste Bewertung zurückgegeben
      return Array.from(allRatedCoordinates.values()).sort((a, b) => b.rating - a.rating)[0];
    }
    return bestRatedCoordinate;
  }

  public static checkRoom(distances: TrilaterationPointDistance[]): string | undefined {
    const bestMatch = this.getBestMatch(distances);
    return bestMatch?.roomName;
  }
}
