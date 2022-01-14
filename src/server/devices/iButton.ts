import { Button } from './button';

export interface iButton {
  tasten: { [id: string]: Button };
  getTastenAssignment(): string;
}
