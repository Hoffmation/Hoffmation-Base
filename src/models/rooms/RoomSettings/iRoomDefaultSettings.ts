import { iTimePair } from '../../../server/config/iConfig';

// These default settings can be overidden within every room
export interface iRoomDefaultSettings {
  // Use shutter to reduce warming of rooms on hot days (detected by weather service)
  rolloHeatReduction: boolean;

  // Should lamps be turned on on Movement
  lampenBeiBewegung: boolean;

  // Should lamps be turned off when sunrise (with shutter up) happened
  lichtSonnenAufgangAus: boolean;

  // Should shutters be closed on sunset (calculated by geolocation)
  sonnenUntergangRollos: boolean;

  // +/- Offset for shutter closing on sunset in minutes
  sonnenUntergangRolloDelay: number;

  // Latest time of shutter closing (regardless of geospecific sunset)
  sonnenUntergangRolloMaxTime: iTimePair;

  // +/- Offset for turning on lamps at movement after/before sunset
  sonnenUntergangLampenDelay: number;

  // Should shutters be opened on sunrise
  sonnenAufgangRollos: boolean;

  // +/- Default Offset for shutters opening on sunrise in minutes
  sonnenAufgangRolloDelay: number;

  // Earliest time of shutter opening (regardless of geospecific sunset)
  sonnenAufgangRolloMinTime: iTimePair;

  // +/- Offset for still turning on lamps at movement after/before sunrise
  sonnenAufgangLampenDelay: number;

  // Time in seconds after which detected movement is reseted
  movementResetTimer: number;

  // Should Light be turned on at day if there are no Windows configured for this room
  lightIfNoWindows: boolean;
}
