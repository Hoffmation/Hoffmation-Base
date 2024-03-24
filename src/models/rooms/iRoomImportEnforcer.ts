/**
 * Every Hoffmation Instance (e.g. using Hoffmation-Express) needs to enforce the Import of all house specific rooms.
 * For Hoffmation-Base to be able to interact with this user-specific import enforcer this interface needs to be implemented.
 */
export interface iRoomImportEnforcer {
  /**
   * This function is called before initializing single devices,
   * to ensure they can be added to the respective room.
   */
  addRoomConstructor(): void;
}
