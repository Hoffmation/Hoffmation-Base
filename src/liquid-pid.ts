/* eslint-disable jsdoc/require-jsdoc */
/**
 * !!Ported from liquid pid!!!!
 * Control the PWM relays from the temperature
 *
 * I'm a NodeJS guy not a scientist, so please be a careful!!!
 * FYI: http://en.wikipedia.org/wiki/PID_controller
 * @author https://github.com/hekike/liquid-pid
 * licence: MIT
 */
export class PIDController {
  private _Tref: number;
  private readonly _Pmax: number;
  private _Kp: number;
  private _Ki: number;
  private _Kd: number;
  private _P: number;
  private _I: number;
  private _D: number;
  private readonly _MaxP: number;
  private readonly _MaxI: number;
  private readonly _MaxD: number;
  private readonly _MaxU: number;
  private _e: number;
  private _U: null | number = null;

  public constructor(options: PIDOptions) {
    this._Tref = options.temp?.ref ?? 0; // Point temperature (This is the temp what you want to reach and hold) (°C)
    this._Pmax = options.Pmax ?? 4000; // Max Power, this is the maximum output of your heater (W)  (Yep, this is the output what you want)

    //  Params of the PID controller
    this._Kp = options.Kp ?? 25; // Proportional gain, a tuning parameter
    this._Ki = options.Ki ?? 1000; // Integral gain, a tuning parameter
    this._Kd = options.Kd ?? 9; // Derivative gain, a tuning parameter

    this._P = 0; // Proportional value ("reduces a large part of the overall error")
    this._I = 0; // Integral value ("reduces the final error in a system")
    this._D = 0; // Derivative value ("helps reduce overshoot and ringing", "~speed")

    this._MaxP = 1000; // Limit the maximum value of the abs Proportional (because micro controller registers)
    this._MaxI = 1000; // Limit the maximum value of the abs Integral (because micro controller registers)
    this._MaxD = 1000; // Limit the maximum value of the abs Derivative (because micro controller registers)
    this._MaxU = 1000; // Limit the maximum value of the controller output (it's not equal with our P "output")

    // Other variables
    this._e = 0; // Actual error
    this._U = null; // Controller output (it's not equal with our P "output")
  }

  public tune(Kp: number, Ki: number, Kd: number): void {
    if (!isNaN(Kp) || !isNaN(Ki) || !isNaN(Kd)) {
      return;
    }

    this._Kp = Kp;
    this._Ki = Ki;
    this._Kd = Kd;
  }

  public getRefTemperature(): number {
    return this._Tref;
  }

  public setPoint(temp: number): number {
    if (isNaN(temp)) {
      return NaN;
    }

    this._Tref = temp;
    return this._Tref;
  }

  public calculate(actualTemperature: number): number {
    const ePrev = this._e; // Save the error for the next loop
    this._e = this._Tref - actualTemperature; // Calculate the actual error

    // Calculate the P
    this._P = this._Kp * this._e;

    if (this._P > this._MaxP) {
      this._P = this._MaxP;
    } else if (this._P < -1 * this._MaxP) {
      this._P = -1 * this._MaxP;
    }

    // Calculate the D
    this._D = this._Kd * (this._e - ePrev);

    if (this._D > this._MaxD) {
      this._D = this._MaxD;
    } else if (this._D < -1 * this._MaxD) {
      this._D = -1 * this._MaxD;
    }

    // Calculate the I
    this._I += this._Ki * this._e;

    if (this._I > this._MaxI) {
      this._I = this._MaxI;
    } else if (this._I < -1 * this._MaxI) {
      this._I = -1 * this._MaxI;
    }

    // PID algorithm
    this._U = this._P + this._I + this._D;

    // Some value limitation
    if (this._U > this._MaxU) {
      this._U = this._MaxU;
    } else if (this._U < 0) {
      // Power cannot be a negative number
      this._U = 0; // this means that the system can only heating
    }

    // Calculate the output
    // and transform U to the [0..1] interval
    return (this._U / 1000) * this._Pmax;
  }
}

export interface PIDOptions {
  Kp?: number;
  Ki?: number;
  Kd?: number;
  Pmax?: number;
  temp?: { ref: number };
}
