/**
 * The settings for the ioBroker instance
 * Currently Hoffmation needs an ioBroker instance, but we might make it independent of it in the future.
 */
export interface iIobrokerSettigns {
  /**
   * Whether states should be initialized by processing each key on its own.
   * This allows to detect states which crash the Websocket Payload limit
   */
  useSplitInitialization?: boolean;
  /**
   * Whether the new/advanced zigbee2mqtt adapter is used
   */
  useZigbee2mqtt?: boolean;
  /**
   * The URL to the ioBroker instance (or the IP-Address)
   */
  ioBrokerUrl: string;
}
