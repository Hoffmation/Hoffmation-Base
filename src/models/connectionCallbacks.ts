export class ConnectionCallbacks {
  public onAuth?: unknown;

  public onCommand?(
    pInstance: string,
    pCommand: string | number | boolean | unknown[] | Record<string, unknown> | null,
    pData: unknown,
  ): boolean;

  public onConnChange?(pState: boolean): void;

  public onError?(error: unknown): void;

  public onObjectChange?(pId: string, pObj: ioBroker.Object): void;

  public onRefresh?: unknown;

  public onUpdate?(id: string, state: ioBroker.State): void;
}
