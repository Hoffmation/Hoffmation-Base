import { iRoomDevice } from './iRoomDevice.js';

/**
 * This interface represents a speaker device.
 *
 * For devices with {@link DeviceCapability.speaker} capability.
 */
export interface iSpeaker extends iRoomDevice {
  /**
   * Plays an mp3 file on the device
   * @param mp3Name - The name of the mp3 file to play
   * @param duration - The duration of the mp3 file in seconds
   * @param [volume] - The volume to play the mp3 file with
   * @param [onlyWhenPlaying] - If true, the mp3 file will only be played when the device is already playing something
   * @param [resolveAfterRevert] - If true, the promise will be resolved after the device has reverted to the previous state
   */
  playOnDevice(
    mp3Name: string,
    duration: number,
    volume?: number,
    onlyWhenPlaying?: boolean,
    resolveAfterRevert?: boolean,
  ): void;

  /**
   * Plays a test message on the device
   */
  playTestMessage(): void;

  /**
   * Plays a file from an url on the device
   * @param url - The url to play
   */
  playUrl(url: string): void;

  /**
   * Stops the current playback on the device
   */
  stop(): void;

  /**
   * Speaks a message on the device using the text-to-speech engine
   * @param pMessage - The message to speak
   * @param [volume] - The volume to speak the message with
   * @param [onlyWhenPlaying] - If true, the message will only be spoken when the device is already playing something
   * @param [resolveAfterRevert] - If true, the promise will be resolved after the device has reverted to the previous state
   */
  speakOnDevice(pMessage: string, volume?: number, onlyWhenPlaying?: boolean, resolveAfterRevert?: boolean): void;
}
