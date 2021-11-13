import { HmIpRoomSettings } from './hmIPRoomSettings';
import { ZigbeeRoomSettings } from './zigbeeRoomSettings';
import { SettingsService } from '../../../server/services/settings-service';
import { iRoomDefaultSettings } from './iRoomDefaultSettings';
import { SunTimeOffsets } from '../../../server/services/time-callback-service';

import { RoomBase } from '../RoomBase';
import { iTimePair } from '../../../server/config/iConfig';
import { iRoomInitializationSettings } from '/server/config/private/src/models/rooms/RoomSettings/iRoomInitializationSettings';

export class RoomSettings implements iRoomDefaultSettings, iRoomInitializationSettings {
  public shortName: string;
  public defaultSettings: iRoomDefaultSettings = SettingsService.settings.roomDefault;
  private _lampenBeiBewegung: boolean = this.defaultSettings.lampenBeiBewegung;
  private _lichtSonnenAufgangAus: boolean = this.defaultSettings.lichtSonnenAufgangAus;
  private _sonnenUntergangRollos: boolean = this.defaultSettings.sonnenUntergangRollos;
  private _sonnenAufgangRollos: boolean = this.defaultSettings.sonnenAufgangRollos;
  private _movementResetTimer: number = this.defaultSettings.movementResetTimer;
  private _sonnenUntergangRolloDelay: number = this.defaultSettings.sonnenUntergangRolloDelay;
  private _sonnenUntergangRolloMaxTime: iTimePair = this.defaultSettings.sonnenUntergangRolloMaxTime;
  private _sonnenUntergangLampenDelay: number = this.defaultSettings.sonnenUntergangLampenDelay;
  private _sonnenAufgangRolloDelay: number = this.defaultSettings.sonnenAufgangRolloDelay;
  private _sonnenAufgangRolloMinTime: iTimePair = this.defaultSettings.sonnenAufgangRolloMinTime;
  private _sonnenAufgangLampenDelay: number = this.defaultSettings.sonnenAufgangLampenDelay;
  private _lightIfNoWindows: boolean = this.defaultSettings.lightIfNoWindows;
  hmIpSettings?: HmIpRoomSettings;
  zigbeeSettings?: ZigbeeRoomSettings;
  public radioUrl: string = 'https://hermes.bcs-systems.de/hitradio-rtl_top40_64k_aac'; // Radio RTL
  etage: number = -1;
  public rolloOffset: SunTimeOffsets;
  public lampOffset: SunTimeOffsets;
  public room?: RoomBase;
  public rolloHeatReduction: boolean = this.defaultSettings.rolloHeatReduction;

  public constructor(initSettings: iRoomInitializationSettings) {
    this.shortName = initSettings.shortName;
    this.etage = initSettings.etage;
    this.hmIpSettings = initSettings.hmIpSettings;
    this.zigbeeSettings = initSettings.zigbeeSettings;
    this.rolloOffset = new SunTimeOffsets(
      this.sonnenAufgangRolloDelay,
      this.sonnenUntergangRolloDelay,
      this.sonnenAufgangRolloMinTime.hours,
      this.sonnenAufgangRolloMinTime.minutes,
      this.sonnenUntergangRolloMaxTime.hours,
      this.sonnenUntergangRolloMaxTime.minutes,
    );
    this.lampOffset = new SunTimeOffsets(this.sonnenAufgangLampenDelay, this.sonnenUntergangLampenDelay);
  }

  private recalcRolloOffset(): void {
    this.rolloOffset = new SunTimeOffsets(
      this.sonnenAufgangRolloDelay,
      this.sonnenUntergangRolloDelay,
      this.sonnenAufgangRolloMinTime.hours,
      this.sonnenAufgangRolloMinTime.minutes,
      this.sonnenUntergangRolloMaxTime.hours,
      this.sonnenUntergangRolloMaxTime.minutes,
    );
    if (this.room) {
      this.room.recalcTimeCallbacks();
    }
  }

  private recalcLampOffset(): void {
    this.lampOffset = new SunTimeOffsets(this.sonnenAufgangLampenDelay, this.sonnenAufgangRolloDelay);
    if (this.room) {
      this.room.recalcTimeCallbacks();
    }
  }

  get sonnenAufgangLampenDelay(): number {
    return this._sonnenAufgangLampenDelay;
  }

  set sonnenAufgangLampenDelay(value: number) {
    this._sonnenAufgangLampenDelay = value;
    this.recalcLampOffset();
  }
  get sonnenAufgangRolloDelay(): number {
    return this._sonnenAufgangRolloDelay;
  }

  set sonnenAufgangRolloDelay(value: number) {
    this._sonnenAufgangRolloDelay = value;
    this.recalcRolloOffset();
  }
  get sonnenUntergangLampenDelay(): number {
    return this._sonnenUntergangLampenDelay;
  }

  set sonnenUntergangLampenDelay(value: number) {
    this._sonnenUntergangLampenDelay = value;
    this.recalcLampOffset();
  }
  get sonnenUntergangRolloDelay(): number {
    return this._sonnenUntergangRolloDelay;
  }

  set sonnenUntergangRolloDelay(value: number) {
    this._sonnenUntergangRolloDelay = value;
  }
  get movementResetTimer(): number {
    return this._movementResetTimer;
  }

  set movementResetTimer(value: number) {
    this._movementResetTimer = value;
  }
  get lichtSonnenAufgangAus(): boolean {
    return this._lichtSonnenAufgangAus;
  }
  get sonnenAufgangRollos(): boolean {
    return this._sonnenAufgangRollos;
  }

  set sonnenAufgangRollos(value: boolean) {
    this._sonnenAufgangRollos = value;
    this.recalcRolloOffset();
  }
  get sonnenUntergangRollos(): boolean {
    return this._sonnenUntergangRollos;
  }

  set sonnenUntergangRollos(value: boolean) {
    this._sonnenUntergangRollos = value;
    this.recalcRolloOffset();
  }
  set lichtSonnenAufgangAus(value: boolean) {
    this._lichtSonnenAufgangAus = value;
  }
  get lampenBeiBewegung(): boolean {
    return this._lampenBeiBewegung;
  }

  set lampenBeiBewegung(value: boolean) {
    this._lampenBeiBewegung = value;
  }

  get sonnenUntergangRolloMaxTime(): iTimePair {
    return this._sonnenUntergangRolloMaxTime;
  }

  set sonnenUntergangRolloMaxTime(value: iTimePair) {
    this._sonnenUntergangRolloMaxTime = value;
    this.recalcRolloOffset();
  }

  get sonnenAufgangRolloMinTime(): iTimePair {
    return this._sonnenAufgangRolloMinTime;
  }

  set sonnenAufgangRolloMinTime(value: iTimePair) {
    this._sonnenAufgangRolloMinTime = value;
    this.recalcRolloOffset();
  }

  get lightIfNoWindows(): boolean {
    return this._lightIfNoWindows;
  }

  set lightIfNoWindows(value: boolean) {
    this._lightIfNoWindows = value;
  }
}
