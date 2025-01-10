import { iTrilaterationPointDistance } from '../../interfaces/iTrilaterationPointDistance';

export class TrilaterationPointDistance implements iTrilaterationPointDistance {
  constructor(
    readonly pointName: string,
    readonly distance: number,
  ) {}
}
