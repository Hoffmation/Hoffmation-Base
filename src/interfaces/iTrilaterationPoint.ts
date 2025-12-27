import { iTrilaterationCoordinate } from './iTrilaterationCoordinate';

/**
 *
 */
export interface iTrilaterationPoint extends iTrilaterationCoordinate {
  /**
   *
   */
  roomName: string;
  /**
   *
   */
  readonly coordinateName: string;

  /**
   *
   */
  getDistance(other: iTrilaterationPoint): number;

  /**
   *
   */
  getDot5Distance(other: iTrilaterationPoint): number;
}
