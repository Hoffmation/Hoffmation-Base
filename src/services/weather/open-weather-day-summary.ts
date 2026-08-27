/**
 * The part of the One Call 3.0 day summary answer the backfill uses.
 *
 * The leaves are `unknown` on purpose. This shape describes an answer from beyond the trust boundary, and
 * declaring them `number` would be a promise nothing on this side can keep - `JSON.parse` returns whatever
 * arrived, and a cast does not check it. `unknown` forces every leaf through a plausibility check before it is
 * used, which is the only place the values are actually established as numbers.
 *
 * Not part of the published surface: it describes a foreign answer, not something anyone implements.
 */
export type OpenWeatherDaySummary = {
  /** Cloud cover of the day, as the endpoint reports it */
  cloud_cover?: { afternoon?: unknown };
  /** Air temperatures of the day, as the endpoint reports them */
  temperature?: { min?: unknown; max?: unknown };
  /** Precipitation of the day, as the endpoint reports it. Absent on an endpoint that does not send it */
  precipitation?: { total?: unknown };
};
