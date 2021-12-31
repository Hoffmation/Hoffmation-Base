export class ringStorage<T> {
  private storage: T[] = [];
  private pointer: number = 0;

  public constructor(private maxSize: number = 10) {}

  public add(object: T): void {
    this.pointer = (this.pointer + 1) % this.maxSize;
    this.storage[this.pointer] = object;
  }

  public readAmount(amount: number): T[] {
    const result: T[] = [];
    amount = Math.max(amount, this.maxSize);
    let pos = this.pointer;
    while (amount > 0) {
      result.push(this.storage[pos]);
      // Um negative Modulo zu umgehen.
      pos = (((pos - 1) % this.maxSize) + this.maxSize) % this.maxSize;
      amount--;
    }
    return result;
  }
}
