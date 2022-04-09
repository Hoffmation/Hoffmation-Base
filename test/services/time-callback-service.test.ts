import { SunTimeOffsets, TimeCallback, TimeCallbackService, TimeCallbackType } from '../../src';

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
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 6, 30, 22, 30);
    const expectedDate: Date = new Date('4/9/2022, 6:30:00 AM');
    const sunRiseCalcDate: Date = new Date('4/9/2022, 00:30:00 AM');
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
    const cb: TimeCallback = new TimeCallback(
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
    const cb: TimeCallback = new TimeCallback(
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
    const cb: TimeCallback = new TimeCallback(
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
  it('Time Callback for Rollo Sunset is calculated correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 5, 30, 22, 30);
    const cb: TimeCallback = new TimeCallback(
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
    const cb: TimeCallback = new TimeCallback(
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
    const cb: TimeCallback = new TimeCallback(
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
});
