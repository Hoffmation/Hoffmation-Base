/**
 * The settings for the polly-service (if needed).
 * This service is used to convert text to speech.
 */
export interface iPollySettings {
  /**
   * The path to store the mp3 files
   */
  mp3Path: string;
  /**
   * The region to use for the Polly service
   */
  region: string;
  /**
   * The signature version to use for the Polly service
   */
  signatureVersion: string;
  /**
   * Your AWS access key id
   */
  accessKeyId: string;
  /**
   * Your AWS secret access key
   */
  secretAccessKey: string;
  /**
   * The voice id to use for the Polly service
   */
  voiceID: string;
}
