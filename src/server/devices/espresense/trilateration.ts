import { TrilaterationBasePoint } from './trilaterationBasePoint';
import { TrilaterationPoint } from './trilaterationPoint';
import { TrilaterationRatedCoordinate } from './trilaterationRatedCoordinate';
import { TrilaterationPointDistance } from './trilaterationPointDistance';
import { LogLevel, RoomBase } from '../../../models';
import { ServerLogService } from '../../services';

export class Trilateration {
  public static readonly basePoints: TrilaterationBasePoint[] = [];
  public static possiblePoints: TrilaterationPoint[] = [];

  public static addRoom(room: RoomBase, startPoint: TrilaterationPoint, endPoint: TrilaterationPoint): void {
    const points = TrilaterationPoint.getPointsInRange(startPoint, endPoint, room.roomName);
    this.possiblePoints.push(...points);
  }

  public static initialize(): void {
    ServerLogService.writeLog(
      LogLevel.Info,
      `Initializing Trilateration for ${this.basePoints.length} base points, with ${this.possiblePoints.length} possible points.`,
    );
    for (const basePoint of this.basePoints) {
      basePoint.fillMap(this.possiblePoints);
    }
  }

  public static getBestMatches(distances: TrilaterationPointDistance[]): TrilaterationPoint[] {
    const bestRatedCoordinates: TrilaterationRatedCoordinate[] = this.getBestRatedCoordinates(distances);
    if (bestRatedCoordinates.length === 0) {
      return [];
    }
    const bestMatches: TrilaterationPoint[] = [];
    for (const bestRatedCoordinate of bestRatedCoordinates) {
      const point = this.possiblePoints.find((point) => point.coordinateName === bestRatedCoordinate.coordinateName);
      if (point === undefined) {
        continue;
      }
      bestMatches.push(point);
    }
    return bestMatches;
  }

  private static getBestRatedCoordinates(distances: TrilaterationPointDistance[]): TrilaterationRatedCoordinate[] {
    const allRatedCoordinates: Map<string, TrilaterationRatedCoordinate> = new Map<
      string,
      TrilaterationRatedCoordinate
    >();
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
      }
    }
    return this.getBestRatedCoordinatesFromMap(allRatedCoordinates);
  }

  public static checkRoom(distances: TrilaterationPointDistance[]): string | undefined {
    const bestMatches = this.getBestMatches(distances);
    if (bestMatches.length === 0) {
      return undefined;
    }
    if (bestMatches.length === 1) {
      return bestMatches[0].roomName;
    }
    // As we have multiple possible winners, we need to check how often which room occurs
    const roomCount: Map<string, number> = new Map<string, number>();
    for (const point of bestMatches) {
      const room = point.roomName;
      const existingCount = roomCount.get(room) ?? 0;
      roomCount.set(room, existingCount + 1);
    }
    return Array.from(roomCount.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  private static getBestRatedCoordinatesFromMap(
    allRatedCoordinates: Map<string, TrilaterationRatedCoordinate>,
  ): TrilaterationRatedCoordinate[] {
    const sortedCoordinates = Array.from(allRatedCoordinates.values()).sort((a, b) => {
      if (a.matchCount !== b.matchCount) {
        return b.matchCount - a.matchCount;
      }
      return b.rating - a.rating;
    });
    const possibleWinner: TrilaterationRatedCoordinate[] = [];
    for (const coordinate of sortedCoordinates) {
      if (possibleWinner.length === 0) {
        possibleWinner.push(coordinate);
        continue;
      }
      if (possibleWinner[0].rating !== coordinate.matchCount) {
        break;
      }
      possibleWinner.push(coordinate);
    }
    return possibleWinner;
  }
}
