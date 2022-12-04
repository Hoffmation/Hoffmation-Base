export interface iIobrokerSettigns {
  /**
   * Whether states should be initialized by processing each key on its own.
   * This allows to detect states which crash the Websocket Payload limit
   */
  useSplitInitialization?: boolean;
}
