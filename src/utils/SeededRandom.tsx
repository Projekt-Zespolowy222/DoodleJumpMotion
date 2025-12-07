// src/utils/SeededRandom.ts
export class SeededRandom {
  private _seed: number;
  constructor(seed = 1) {
    this._seed = seed % 2147483647;
    if (this._seed <= 0) this._seed += 2147483646;
  }
  // LCG (часто используемый вариант)
  next() {
    this._seed = (this._seed * 16807) % 2147483647;
    return (this._seed - 1) / 2147483646; // 0..1
  }
  // min ≤ n < max
  range(min: number, max: number) {
    return min + this.next() * (max - min);
  }
}