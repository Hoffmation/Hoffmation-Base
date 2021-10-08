export class ConnectionCallbacks {
  public onAuth?: any;
  public onCommand?(
    pInstance: string,
    pCommand: string | number | boolean | any[] | Record<string, any> | null,
    pData: any,
  ): boolean;
  public onConnChange?(pState: boolean): void;
  public onError?: any;
  public onObjectChange?(pId: string, pObj: ioBroker.Object): void;
  public onRefresh?: any;
  public onUpdate?(id: string, state: ioBroker.State): void;
}
