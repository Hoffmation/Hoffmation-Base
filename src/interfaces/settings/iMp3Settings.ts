/**
 * The settings for the mp3-server (if needed).
 * A mp3-server is mainly needed for playing text-to-speech messages on speakers (e.g. Sonos)
 */
export interface iMp3Settings {
  /**
   * local path for the mp3 files to store/load
   */
  path: string;
  /**
   * external reachable adress to access those mp3 files
   */
  serverAddress: string;
}
