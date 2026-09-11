export interface OneEuroParams {
  /** Cutoff frequency at rest, Hz. Lower removes more jitter but lags more. */
  minCutoff: number;
  /** How much the cutoff rises with speed, per unit of the signal per second. */
  beta: number;
  /** Cutoff, Hz, of the low-pass on the speed estimate. */
  derivativeCutoff: number;
}

function smoothingFactor(rateHz: number, cutoffHz: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  const period = 1 / rateHz;
  return 1 / (1 + tau / period);
}

/**
 * The One Euro filter (Casiez, Roussel, Vogel 2012): a low-pass whose cutoff grows
 * with the signal's speed, so it is steady when the hand rests and responsive when it
 * moves. One instance per axis.
 */
export class OneEuroFilter {
  private value: number | null = null;
  private derivative = 0;

  constructor(private readonly params: OneEuroParams) {}

  reset() {
    this.value = null;
    this.derivative = 0;
  }

  filter(raw: number, dtSeconds: number): number {
    if (this.value === null || dtSeconds <= 0) {
      this.value = raw;
      this.derivative = 0;
      return raw;
    }
    const rate = 1 / dtSeconds;
    const rawDerivative = (raw - this.value) * rate;
    const derivativeAlpha = smoothingFactor(rate, this.params.derivativeCutoff);
    this.derivative = derivativeAlpha * rawDerivative + (1 - derivativeAlpha) * this.derivative;
    const cutoff = this.params.minCutoff + this.params.beta * Math.abs(this.derivative);
    const alpha = smoothingFactor(rate, cutoff);
    this.value = alpha * raw + (1 - alpha) * this.value;
    return this.value;
  }
}
