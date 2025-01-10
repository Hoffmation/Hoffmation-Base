import { iButtonCapabilities } from '../../interfaces/iButtonCapabilities';

export class ButtonCapabilities implements iButtonCapabilities {
  /**
   * Whether the button supports short press
   */
  public shortPress: boolean = true;
  /**
   * Whether the button supports double press
   */
  public doublePress: boolean = true;
  /**
   * Whether the button supports triple press
   */
  public triplePress: boolean = true;
  /**
   * Whether the button supports long press
   */
  public longPress: boolean = true;
}
