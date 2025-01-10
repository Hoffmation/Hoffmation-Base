import { iObjectSettings } from './settings';
import { iTimePair } from './iTimePair';

export interface iRoomSettings extends iObjectSettings {
  ambientLightAfterSunset: boolean;
  lichtSonnenAufgangAus: boolean;
  radioUrl: string;
  rolloHeatReduction: boolean;
  lampenBeiBewegung: boolean;
  lightIfNoWindows: boolean;
  movementResetTimer: number;
  roomIsAlwaysDark: boolean;
  sonnenAufgangLampenDelay: number;
  sonnenAufgangRolloDelay: number;
  sonnenAufgangRollos: boolean;
  sonnenUntergangRolloAdditionalOffsetPerCloudiness: number;
  sonnenUntergangRolloMaxTime: iTimePair;
  sonnenAufgangRolloMinTime: iTimePair;
  sonnenUntergangRolloDelay: number;
  sonnenUntergangLampenDelay: number;
  sonnenUntergangRollos: boolean;
  includeLampsInNormalMovementLightning: boolean;

  fromPartialObject(_obj: Partial<iRoomSettings>): void;
}
