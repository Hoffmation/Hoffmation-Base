/* eslint-disable jsdoc/require-jsdoc */
export interface KeyListEntity {
  key: string;
  doc: string;
  unit: (x: string) => boolean | string | number;
}
