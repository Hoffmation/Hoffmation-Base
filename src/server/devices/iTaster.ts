import { Taste } from 'index';

export interface iTaster {
  tasten: { [id: string]: Taste };
  getTastenAssignment(): string;
}
