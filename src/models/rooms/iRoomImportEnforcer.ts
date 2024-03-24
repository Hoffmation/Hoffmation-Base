export interface iRoomImportEnforcer {
  /**
   * This function is called before initializing single devices,
   * to ensure they can be added to the respective room.
   */
  addRoomConstructor(): void;
}
