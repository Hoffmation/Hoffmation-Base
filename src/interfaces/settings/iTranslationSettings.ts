/**
 * The settings for the translation-service.
 * The translation-service is used to provide certain messages in the desired language.
 * Currently only german and english are supported.
 * @warning The translation-service is not yet fully implemented and only used in some cases.
 */
export interface iTranslationSettings {
  /**
   * The desired language for the translations
   * @default 'en'
   */
  language: string;
}
