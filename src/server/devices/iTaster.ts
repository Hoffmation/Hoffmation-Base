import { Taste } from './taste';

export interface iTaster {
  tasten: { [id: string]: Taste };
  getTastenAssignment(): string;
}
