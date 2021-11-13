export interface IDeviceUpdater {
  updateState(id: string, state: ioBroker.State, initial?: boolean): void;
  updateObject(pId: string, pObj: ioBroker.Object): void;
}
