import { iPersist } from '../../interfaces';

export class Persistence {
  /**
   * The persitence layer object
   */
  public static dbo: iPersist | undefined;

  public static get anyDboActive(): boolean {
    return this.dbo !== undefined;
  }
}
