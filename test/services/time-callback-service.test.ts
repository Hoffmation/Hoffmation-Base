import {
  ITimeCallback,
  SettingsService,
  SunTimeOffsets,
  TimeCallback,
  TimeCallbackService,
  TimeCallbackType,
  TimeOfDay,
} from '../../src';

jest.mock('unifi-protect', () => jest.fn()); // Working now, phew
jest.mock('unifi-access', () => jest.fn()); // Working now, phew

describe('TimeCallbackService', () => {
  it('next Maximum Time is Today and correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 6, 30, 22, 30);
    const expectedDate: Date = new Date('4/9/2022, 10:30:00 PM');
    const sunRiseCalcDate: Date = new Date('4/9/2022, 8:30:00 AM');
    const minimumOffset = offset.getNextMaximumSunset(sunRiseCalcDate);
    expect(minimumOffset.toLocaleString()).toBe(expectedDate.toLocaleString());
  });
  it('next Maximum Time is Tomorrow and correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 6, 30, 22, 30);
    const expectedDate: Date = new Date('4/10/2022, 10:30:00 PM');
    const sunRiseCalcDate: Date = new Date('4/9/2022, 11:30:00 PM');
    const minimumOffset = offset.getNextMaximumSunset(sunRiseCalcDate);
    expect(minimumOffset.toLocaleString()).toBe(expectedDate.toLocaleString());
  });
  it('next Minimum Time is today and correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 7, 30, 22, 30);
    const expectedDate: Date = new Date('4/9/2022, 7:30:00 AM');
    const sunRiseCalcDate: Date = new Date('4/9/2022, 6:45:00 AM');
    const minimumOffset = offset.getNextMinimumSunrise(sunRiseCalcDate);
    expect(minimumOffset.toLocaleString()).toBe(expectedDate.toLocaleString());
  });
  it('next Minimum Time is next Day and correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 6, 30, 22, 30);
    const expectedDate: Date = new Date('4/10/2022, 6:30:00 AM');
    const sunRiseCalcDate: Date = new Date('4/9/2022, 10:30:00 PM');
    const minimumOffset = offset.getNextMinimumSunrise(sunRiseCalcDate);
    expect(minimumOffset.toLocaleString()).toBe(expectedDate.toLocaleString());
  });
  it('Time Callback for Rollo Sunrise is calculated correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 4, 30, 22, 30);
    const cb: ITimeCallback = new TimeCallback(
      '',
      TimeCallbackType.Sunrise,
      () => {
        /*Nothing*/
      },
      0,
      undefined,
      undefined,
      offset,
    );
    const sunRiseCalcDate: Date = new Date('4/10/2022, 0:30:00 AM');
    const nextToDoCalculationDate: Date = new Date('4/9/2022, 10:30:00 PM');
    const expectedDate: Date = new Date('4/10/2022, 5:10:08 AM');
    TimeCallbackService.updateSunRise(sunRiseCalcDate, 55, 0);
    cb.recalcNextToDo(nextToDoCalculationDate);
    const nextToDoDate: Date = cb.nextToDo ?? new Date(0);
    expect(nextToDoDate.toLocaleString()).toBe(expectedDate.toLocaleString());
  });
  it('Time Callback for Rollo Sunrise respects offset', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(10, 0, 4, 30, 22, 30);
    const cb: ITimeCallback = new TimeCallback(
      '',
      TimeCallbackType.Sunrise,
      () => {
        /*Nothing*/
      },
      offset.sunrise,
      undefined,
      undefined,
      offset,
    );
    const sunRiseCalcDate: Date = new Date('4/10/2022, 0:30:00 AM');
    const nextToDoCalculationDate: Date = new Date('4/9/2022, 10:30:00 PM');
    const expectedDate: Date = new Date('4/10/2022, 5:20:08 AM');
    TimeCallbackService.updateSunRise(sunRiseCalcDate, 55, 0);
    cb.recalcNextToDo(nextToDoCalculationDate);
    const nextToDoDate: Date = cb.nextToDo ?? new Date(0);
    expect(nextToDoDate.toLocaleString()).toBe(expectedDate.toLocaleString());
  });
  it('Time Callback for Rollo Sunrise respects min hours', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 5, 30, 22, 30);
    const cb: ITimeCallback = new TimeCallback(
      '',
      TimeCallbackType.Sunrise,
      () => {
        /*Nothing*/
      },
      offset.sunrise,
      undefined,
      undefined,
      offset,
    );
    const sunRiseCalcDate: Date = new Date('4/10/2022, 0:30:00 AM');
    const nextToDoCalculationDate: Date = new Date('4/9/2022, 10:30:00 PM');
    const expectedDate: Date = new Date('4/10/2022, 5:30:00 AM');
    TimeCallbackService.updateSunRise(sunRiseCalcDate, 55, 0);
    cb.recalcNextToDo(nextToDoCalculationDate);
    const nextToDoDate: Date = cb.nextToDo ?? new Date(0);
    expect(nextToDoDate.toLocaleString()).toBe(expectedDate.toLocaleString());
  });
  it('Time Callback for Rollo Sunrise respects min hours in winter', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 8, 30, 22, 30);
    const cb: ITimeCallback = new TimeCallback(
      '',
      TimeCallbackType.Sunrise,
      () => {
        /*Nothing*/
      },
      offset.sunrise,
      undefined,
      undefined,
      offset,
    );
    const sunRiseCalcDate: Date = new Date('11/25/2022, 0:30:00 AM');
    const nextToDoCalculationDate: Date = new Date('11/24/2022, 10:30:00 PM');
    const expectedDate: Date = new Date('11/25/2022, 8:30:00 AM');
    TimeCallbackService.updateSunRise(sunRiseCalcDate, 55, 0);
    cb.recalcNextToDo(nextToDoCalculationDate);
    const nextToDoDate: Date = cb.nextToDo ?? new Date(0);
    expect(nextToDoDate.toLocaleString()).toBe(expectedDate.toLocaleString());
  });
  it('Time Callback for Rollo Sunrise handles recalculation correctly', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 8, 30, 22, 30);
    const cb: ITimeCallback = new TimeCallback(
      '',
      TimeCallbackType.Sunrise,
      () => {
        /*Nothing*/
      },
      offset.sunrise,
      undefined,
      undefined,
      offset,
    );
    const sunRiseCalcDate: Date = new Date('11/25/2022, 0:30:00 AM');
    const nextToDoCalculationDate: Date = new Date('11/24/2022, 10:30:00 PM');
    const expectedDate: Date = new Date('11/25/2022, 8:30:00 AM');
    TimeCallbackService.updateSunRise(sunRiseCalcDate, 55, 0);
    TimeCallbackService.updateSunSet(sunRiseCalcDate, 55, 0);
    cb.recalcNextToDo(nextToDoCalculationDate);
    let nextToDoDate: Date = cb.nextToDo ?? new Date(0);
    expect(nextToDoDate.toLocaleString()).toBe(expectedDate.toLocaleString());

    // Until this point everything is as usual.
    // --> But if we passed the sunrise it will recalc for the next day.

    const criticalRecalcTime: Date = new Date('11/25/2022, 8:27:00 AM');
    const copyDate: Date = new Date(criticalRecalcTime.getTime());
    const tomorrow: Date = new Date(copyDate.setHours(2, 0, 0, 0) + 24 * 60 * 60 * 1000);
    TimeCallbackService.updateSunRise(tomorrow, 55, 0);
    expect(TimeCallbackService.nextSunRise.getDate()).toBe(26);
    // Next Sunrise is now calculated for the next day

    cb.recalcNextToDo(criticalRecalcTime);
    nextToDoDate = cb.nextToDo ?? new Date(0);
    // We should still have the same callback time, as it is still in the future
    expect(nextToDoDate.toLocaleString()).toBe(expectedDate.toLocaleString());

    // If we now perform the cb, we should expect the next event at next day:
    cb.lastDone = expectedDate;
    const lastDayRecalcTime: Date = new Date('11/25/2022, 8:31:00 AM');
    cb.recalcNextToDo(lastDayRecalcTime);
    nextToDoDate = cb.nextToDo ?? new Date(0);
    const expectedLastDate: Date = new Date('11/26/2022, 8:30:00 AM');
    expect(nextToDoDate.toLocaleString()).toBe(expectedLastDate.toLocaleString());
  });
  it('Time Callback for Rollo Sunset is calculated correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 5, 30, 22, 30);
    const cb: ITimeCallback = new TimeCallback(
      '',
      TimeCallbackType.SunSet,
      () => {
        /*Nothing*/
      },
      offset.sunset,
      undefined,
      undefined,
      offset,
    );
    const sunSetCalcDate: Date = new Date('4/10/2022, 0:30:00 AM');
    const nextToDoCalculationDate: Date = new Date('4/9/2022, 10:30:00 PM');
    const expectedDate: Date = new Date('4/10/2022, 6:53:51 PM');
    TimeCallbackService.updateSunSet(sunSetCalcDate, 55, 0);
    cb.recalcNextToDo(nextToDoCalculationDate);
    const nextToDoDate: Date = cb.nextToDo ?? new Date(0);
    expect(nextToDoDate.toLocaleString()).toBe(expectedDate.toLocaleString());
  });
  it('Time Callback for Rollo Sunset respects offset', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, -20, 5, 30, 22, 30);
    const cb: ITimeCallback = new TimeCallback(
      '',
      TimeCallbackType.SunSet,
      () => {
        /*Nothing*/
      },
      offset.sunset,
      undefined,
      undefined,
      offset,
    );
    const sunSetCalcDate: Date = new Date('4/10/2022, 0:30:00 AM');
    const nextToDoCalculationDate: Date = new Date('4/9/2022, 10:30:00 PM');
    const expectedDate: Date = new Date('4/10/2022, 6:33:51 PM');
    TimeCallbackService.updateSunSet(sunSetCalcDate, 55, 0);
    cb.recalcNextToDo(nextToDoCalculationDate);
    const nextToDoDate: Date = cb.nextToDo ?? new Date(0);
    expect(nextToDoDate.toLocaleString()).toBe(expectedDate.toLocaleString());
  });
  it('Time Callback for Rollo Sunset respects maximum Hours', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 5, 30, 18, 30);
    const cb: ITimeCallback = new TimeCallback(
      '',
      TimeCallbackType.SunSet,
      () => {
        /*Nothing*/
      },
      offset.sunset,
      undefined,
      undefined,
      offset,
    );
    const sunSetCalcDate: Date = new Date('4/10/2022, 0:30:00 AM');
    const nextToDoCalculationDate: Date = new Date('4/9/2022, 10:30:00 PM');
    const expectedDate: Date = new Date('4/10/2022, 6:30:00 PM');
    TimeCallbackService.updateSunSet(sunSetCalcDate, 55, 0);
    cb.recalcNextToDo(nextToDoCalculationDate);
    const nextToDoDate: Date = cb.nextToDo ?? new Date(0);
    expect(nextToDoDate.toLocaleString()).toBe(expectedDate.toLocaleString());
  });
  it('calculates time of day correct', async () => {
    SettingsService.settings = SettingsService.testConfig;
    TimeCallbackService.recalcSunTimes(new Date('09/18/2022, 3:24:00 AM'));
    const calculationDate: Date = new Date('09/18/2022, 7:24:00 AM');
    const offset: SunTimeOffsets = new SunTimeOffsets(15, -10, 6, 30, 22, 30);
    const calculatedTimeOfDay = TimeCallbackService.dayType(offset, calculationDate);
    expect(calculatedTimeOfDay).toBe(TimeOfDay.Daylight);
  });
  it('calculates time of day correct in winter', async () => {
    SettingsService.settings = SettingsService.testConfig;
    TimeCallbackService.recalcSunTimes(new Date('12/11/2022, 3:24:00 AM'));
    const calculationDate: Date = new Date('12/11/2022, 8:54:00 PM');
    const offset: SunTimeOffsets = new SunTimeOffsets(15, -10, 6, 30, 22, 30);
    const calculatedTimeOfDay = TimeCallbackService.dayType(offset, calculationDate);
    expect(calculatedTimeOfDay).toBe(TimeOfDay.AfterSunset);
  });
  it('calculates time of day correct on daylight savings change day', async () => {
    SettingsService.settings = SettingsService.testConfig;
    TimeCallbackService.recalcSunTimes(new Date('10/30/2022, 3:24:00 AM'));
    const calculationDate: Date = new Date('10/30/2022, 7:24:00 AM');
    const offset: SunTimeOffsets = new SunTimeOffsets(60, -10, 6, 30, 22, 30);
    const calculatedTimeOfDay = TimeCallbackService.dayType(offset, calculationDate);
    expect(calculatedTimeOfDay).toBe(TimeOfDay.Daylight);
  });
});
