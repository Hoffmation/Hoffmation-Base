export class RingStorage<T> {
  private storage: T[] = [];
  private pointer: number = 0;

  public get maximumSize(): number {
    return this.maxSize;
  }

  public constructor(private maxSize: number = 10) {}

  public add(object: T): void {
    this.pointer = (this.pointer + 1) % this.maxSize;
    this.storage[this.pointer] = object;
  }

  public readAmount(amount: number): T[] {
    const result: T[] = [];
    // Never return more than requested, and never more than the ring holds.
    amount = Math.min(amount, this.maxSize);
    let pos = this.pointer;
    while (amount > 0) {
      const entry = this.storage[pos];
      // Slots not written yet must not surface as undefined entries in a T[].
      if (entry !== undefined) {
        result.push(entry);
      }
      // Um negative Modulo zu umgehen.
      pos = (((pos - 1) % this.maxSize) + this.maxSize) % this.maxSize;
      amount--;
    }
    return result;
  }
}
