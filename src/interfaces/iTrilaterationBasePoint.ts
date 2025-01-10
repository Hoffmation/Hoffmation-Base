import { iTrilaterationPoint } from './iTrilaterationPoint';
import { iTrilaterationRatedCoordinate } from './iTrilaterationRatedCoordinate';

/**
 *
 */
export interface iTrilaterationBasePoint {
  /**
   *
   */
  ownPoint: iTrilaterationPoint;
  /**
   *
   */
  precalculatedDistancesMap: Map<number, string[]>;
  /**
   *
   */
  readonly x: number;
  /**
   *
   */
  readonly y: number;
  /**
   *
   */
  readonly z: number;
  /**
   *
   */
  readonly roomName: string;

  /**
   *
   */
  getRatedCoordinates(distance: number): iTrilaterationRatedCoordinate[];

  /**
   *
   */
  rateCoordinates(distance: number, result: iTrilaterationRatedCoordinate[], rating: number): void;

  /**
   *
   */
  fillMap(points: iTrilaterationPoint[]): void;
}
