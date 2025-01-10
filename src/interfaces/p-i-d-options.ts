/**
 *
 */
export interface PIDOptions {
  /**
   *
   */
  Kp?: number;
  /**
   *
   */
  Ki?: number;
  /**
   *
   */
  Kd?: number;
  /**
   *
   */
  Pmax?: number;
  /**
   *
   */
  temp?: {
    /**
     *
     */
    ref: number;
  };
}
