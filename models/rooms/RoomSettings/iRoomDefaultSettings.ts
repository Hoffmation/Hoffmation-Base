import { iTimePair } from '../../../server/config/iConfig';

export interface iRoomDefaultSettings {
  rolloHeatReduction: boolean;
  lampenBeiBewegung: boolean;
  lichtSonnenAufgangAus: boolean;
  sonnenUntergangRollos: boolean;
  sonnenUntergangRolloDelay: number;
  sonnenUntergangRolloMaxTime: iTimePair;
  sonnenUntergangLampenDelay: number;
  sonnenAufgangRollos: boolean;
  sonnenAufgangRolloDelay: number;
  sonnenAufgangRolloMinTime: iTimePair;
  sonnenAufgangLampenDelay: number;
  movementResetTimer: number;
  lightIfNoWindows: boolean;
}
