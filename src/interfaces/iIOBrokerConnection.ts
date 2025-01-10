import { iDisposable } from './iDisposeable';

/**
 *
 */
export interface iIOBrokerConnection extends iDisposable {
  /**
   *
   */
  setState(
    pointId: string,
    state: string | number | boolean | ioBroker.State | ioBroker.SettableState | null,
    callback?: ioBroker.SetStateCallback,
  ): void;
}
