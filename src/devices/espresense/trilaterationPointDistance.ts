import { iTrilaterationPointDistance } from '../../interfaces';

export class TrilaterationPointDistance implements iTrilaterationPointDistance {
  constructor(
    readonly pointName: string,
    readonly distance: number,
  ) {}
}
