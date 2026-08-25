/* eslint-disable jsdoc/require-jsdoc */
import { KeyListEntity } from './KeyListEntity';

export interface KeyListEntityResponse<V> {
  key?: KeyListEntity;
  rawValue?: string;
  //HTTP VALUE RESPONSE
  value: V;
}
