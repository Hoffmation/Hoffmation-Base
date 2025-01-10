import { iCountToday } from '../../interfaces';

export class CountToday implements iCountToday {
  constructor(public count: number) {}
}
