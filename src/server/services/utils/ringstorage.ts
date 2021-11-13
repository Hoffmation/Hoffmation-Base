export class ringStorage {
  private storage: string[] = [];
  private pointer: number = 0;

  public constructor(private maxSize: number = 10) {}

  public add(text: string): void {
    this.pointer = (this.pointer + 1) % this.maxSize;
    this.storage[this.pointer] = text;
  }

  public readAmount(amount: number): string[] {
    const result: string[] = [];
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
