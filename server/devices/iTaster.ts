import { Taste } from "/server/config/private/server/devices/taste";

export interface iTaster {
  tasten: {[id: string]: Taste};
  getTastenAssignment(): string;
}
