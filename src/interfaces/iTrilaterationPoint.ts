/**
 *
 */
export interface iTrilaterationPoint {
  /**
   *
   */
  x: number;
  /**
   *
   */
  y: number;
  /**
   *
   */
  z: number;
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
