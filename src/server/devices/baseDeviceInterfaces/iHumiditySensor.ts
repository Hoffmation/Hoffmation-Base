import { iRoomDevice } from './iRoomDevice';

export const UNDEFINED_HUMIDITY_VALUE = -1;

// TODO: Add missing Comments
export interface iHumiditySensor extends iRoomDevice {
  readonly persistHumiditySensorInterval: NodeJS.Timeout;
  readonly humidity: number;

  addHumidityCallback(pCallback: (pValue: number) => void): void;

  persistHumiditySensor(): void;
}
