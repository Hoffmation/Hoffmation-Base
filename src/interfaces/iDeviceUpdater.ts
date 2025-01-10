/**
 * Service to update the state of any device
 */
export interface IDeviceUpdater {
  /**
   * Updates the state of a device
   * @param id - The id of the device
   * @param state - The new state
   * @param initial - Whether this is an initial state update
   */
  updateState(id: string, state: ioBroker.State, initial?: boolean): void;

  /**
   * Updates the given object
   * @param pId - The id of the object
   * @param pObj - The new object
   */
  updateObject(pId: string, pObj: ioBroker.Object): void;

  /**
   *
   */
  onConnChanged(): void;
}
