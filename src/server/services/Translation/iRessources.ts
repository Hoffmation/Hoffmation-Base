export interface IRessourceObject {
  de?: string;
  en: string;
}

export interface IRessources {
  closedAfterMinutes: IRessourceObject;
  wasOpened: IRessourceObject;
  justClosed: IRessourceObject;
}
