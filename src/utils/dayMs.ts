/**
 * The length of a day in milliseconds.
 *
 * A fixed length, not a calendar day: on the two days a year a zone changes its offset, a real day is 23 or
 * 25 hours long. Use calendar arithmetic where the boundary of a day matters.
 */
export const DAYMS: number = 24 * 60 * 60 * 1000;
