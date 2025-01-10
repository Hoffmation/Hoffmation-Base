/**
 *
 */
export interface iZigbeeDevice {
  /**
   *
   */
  readonly available: boolean;
  /**
   *
   */
  readonly linkQuality: number;
  /**
   *
   */
  readonly lastUpdate: Date;

  /**
   *
   */
  readonly id: string;
}
