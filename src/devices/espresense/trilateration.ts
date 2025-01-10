import { LogDebugType, LogLevel } from '../../enums';
import { ServerLogService } from '../../logging';
import { RoomBase } from '../../services';
import {
  iTrilaterationBasePoint,
  iTrilaterationPoint,
  iTrilaterationPointDistance,
  iTrilaterationRatedCoordinate,
} from '../../interfaces';
import { TrilaterationPoint } from './trilaterationPoint';

export class Trilateration {
  /**
   * A list of all reference points for trilateration (e.g. Rooms, {@link iBluetoothDetector}s)
   */
  public static readonly basePoints: iTrilaterationBasePoint[] = [];
  /**
   * A list of all possible points for trilateration in this home, used for increased calculation speed
   * This list is filled mostly by {@link Trilateration.addRoom} thus resulting in the air outside the house not being included
   */
  public static possiblePoints: iTrilaterationPoint[] = [];

  public static addRoom(room: RoomBase, startPoint: iTrilaterationPoint, endPoint: iTrilaterationPoint): void {
    const points = TrilaterationPoint.getPointsInRange(startPoint, endPoint, room.roomName);
    ServerLogService.writeLog(
      LogLevel.Debug,
      `Adding ${points.length} trilateration points for room ${room.roomName} from ${startPoint.coordinateName} to ${endPoint.coordinateName}`,
    );
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

  public static getBestMatches(distances: iTrilaterationPointDistance[]): iTrilaterationPoint[] {
    const bestRatedCoordinates: iTrilaterationRatedCoordinate[] = this.getBestRatedCoordinates(distances);
    if (bestRatedCoordinates.length === 0) {
      ServerLogService.writeLog(LogLevel.Debug, `No best rated coordinates found for ${distances.length} distances.`, {
        debugType: LogDebugType.Trilateration,
      });
      return [];
    }
    const bestMatches: iTrilaterationPoint[] = [];
    for (const bestRatedCoordinate of bestRatedCoordinates) {
      const point = this.possiblePoints.find((point) => point.coordinateName === bestRatedCoordinate.coordinateName);
      if (point === undefined) {
        continue;
      }
      bestMatches.push(point);
    }
    return bestMatches;
  }

  public static checkRoom(distances: iTrilaterationPointDistance[]): string | undefined {
    const bestMatches = this.getBestMatches(distances);
    ServerLogService.writeLog(
      LogLevel.Debug,
      `Found ${bestMatches.length} best matches for ${distances.length} distances.`,
      { debugType: LogDebugType.Trilateration },
    );
    if (bestMatches.length === 0) {
      return undefined;
    }
    if (bestMatches.length === 1) {
      return bestMatches[0].roomName;
    }
    // As we have multiple possible winners, we need to check how often which room occurs
    const roomCountMap: Map<string, number> = new Map<string, number>();
    for (const point of bestMatches) {
      const room = point.roomName;
      const existingCount = roomCountMap.get(room) ?? 0;
      roomCountMap.set(room, existingCount + 1);
    }

    return Array.from(roomCountMap.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  private static getBestRatedCoordinates(distances: iTrilaterationPointDistance[]): iTrilaterationRatedCoordinate[] {
    const allRatedCoordinatesMap: Map<string, iTrilaterationRatedCoordinate> = new Map<
      string,
      iTrilaterationRatedCoordinate
    >();
    for (const dist of distances) {
      const point = this.basePoints.find((basePoint) => basePoint.ownPoint.coordinateName === dist.pointName);
      if (point === undefined) {
        const possiblePoints: string[] = [];
        for (const basePoint of this.basePoints) {
          possiblePoints.push(basePoint.ownPoint.coordinateName);
        }
        ServerLogService.writeLog(
          LogLevel.Warn,
          `Could not find base point for ${dist.pointName}, possible points: ${possiblePoints.join(', ')}`,
        );
        continue;
      }
      const ratedCoordinates = point.getRatedCoordinates(dist.distance);
      ServerLogService.writeLog(
        LogLevel.Debug,
        `Found ${ratedCoordinates.length} rated coordinates for ${dist.pointName} within distance of ${dist.distance}m`,
        { debugType: LogDebugType.Trilateration },
      );
      for (const ratedCoordinate of ratedCoordinates) {
        const existingCoordinate = allRatedCoordinatesMap.get(ratedCoordinate.coordinateName);
        if (existingCoordinate === undefined) {
          allRatedCoordinatesMap.set(ratedCoordinate.coordinateName, ratedCoordinate);
          continue;
        }

        existingCoordinate.rating += ratedCoordinate.rating;
        existingCoordinate.matchCount++;
      }
    }
    return this.getBestRatedCoordinatesFromMap(allRatedCoordinatesMap);
  }

  private static getBestRatedCoordinatesFromMap(
    allRatedCoordinates: Map<string, iTrilaterationRatedCoordinate>,
  ): iTrilaterationRatedCoordinate[] {
    const sortedCoordinates = Array.from(allRatedCoordinates.values()).sort((a, b) => {
      if (a.matchCount !== b.matchCount) {
        return b.matchCount - a.matchCount;
      }
      return b.rating - a.rating;
    });
    ServerLogService.writeLog(LogLevel.Debug, `First sorted coordinate: ${JSON.stringify(sortedCoordinates[0])}`, {
      debugType: LogDebugType.Trilateration,
    });
    const possibleWinner: iTrilaterationRatedCoordinate[] = [];
    for (const coordinate of sortedCoordinates) {
      if (possibleWinner.length === 0) {
        possibleWinner.push(coordinate);
        continue;
      }
      if (possibleWinner[0].rating > coordinate.rating || possibleWinner[0].matchCount > coordinate.matchCount) {
        break;
      }
      possibleWinner.push(coordinate);
    }
    return possibleWinner;
  }
}
