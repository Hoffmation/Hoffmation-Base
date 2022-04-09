import { SunTimeOffsets, TimeCallback, TimeCallbackService, TimeCallbackType } from "../../src";

describe('TimeCallbackService', () => {
  it('next Maximum Time is Today and correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 6, 30, 22, 30);
    const maximumOffset = offset.getNextMaximumSunset(new Date(1649529000000));
    expect(maximumOffset.getTime()).toBe(1649536200000);
  });
  it('next Maximum Time is Tomorrow and correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 6, 30, 22, 30);
    const maximumOffset = offset.getNextMaximumSunset(new Date(1649539800000));
    expect(maximumOffset.getTime()).toBe(1649622600000);
  });
  it('next Minimum Time is today and correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 6, 30, 22, 30);
    const minimumOffset = offset.getNextMinimumSunrise(new Date(1649557800000));
    expect(minimumOffset.getTime()).toBe(1649565000000);
  });
  it('next Minimum Time is next Day and correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 6, 30, 22, 30);
    const minimumOffset = offset.getNextMinimumSunrise(new Date(1649529000000));
    expect(minimumOffset.getTime()).toBe(1649565000000);
  });
  it('Time Callback for Rollo Sunrise is calculated correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 6, 30, 22, 30);
    const cb: TimeCallback = new TimeCallback('', TimeCallbackType.Sunrise, () => {}, 0, undefined, undefined, offset);
    TimeCallbackService.updateSunRise(new Date(1649543400000));
    cb.recalcNextToDo(new Date(1649529000000));
    expect(cb.nextToDo!.getTime()).toBe(1649566197828);
  });
  it('Time Callback for Rollo Sunrise respects offset', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(10, 0, 6, 30, 22, 30);
    const cb: TimeCallback = new TimeCallback('', TimeCallbackType.Sunrise, () => {}, offset.sunrise, undefined, undefined, offset);
    TimeCallbackService.updateSunRise(new Date(1649543400000));
    cb.recalcNextToDo(new Date(1649529000000));
    expect(cb.nextToDo!.getTime()).toBe(1649566797828);
  });
  it('Time Callback for Rollo Sunrise respects min hours', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 7, 30, 22, 30);
    const cb: TimeCallback = new TimeCallback('', TimeCallbackType.Sunrise, () => {}, 0, undefined, undefined, offset);
    TimeCallbackService.updateSunRise(new Date(1649543400000));
    cb.recalcNextToDo(new Date(1649529000000));
    expect(cb.nextToDo!.getTime()).toBe(1649568600000);
  });
  it('Time Callback for Rollo Sunset is calculated correct', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 6, 30, 22, 30);
    const cb: TimeCallback = new TimeCallback('', TimeCallbackType.SunSet, () => {}, 0, undefined, undefined, offset);
    TimeCallbackService.updateSunSet(new Date(1649543400000));
    cb.recalcNextToDo(new Date(1649529000000));
    expect(cb.nextToDo!.getTime()).toBe(1649614660829);
  });
  it('Time Callback for Rollo Sunset respects offset', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, -10, 6, 30, 22, 30);
    const cb: TimeCallback = new TimeCallback('', TimeCallbackType.SunSet, () => {}, offset.sunset, undefined, undefined, offset);
    TimeCallbackService.updateSunSet(new Date(1649543400000));
    cb.recalcNextToDo(new Date(1649529000000));
    expect(cb.nextToDo!.getTime()).toBe(1649614060829);
  });
  it('Time Callback for Rollo Sunset respects maximum Hours', async () => {
    const offset: SunTimeOffsets = new SunTimeOffsets(0, 0, 6, 30, 20, 0);
    const cb: TimeCallback = new TimeCallback('', TimeCallbackType.SunSet, () => {}, 0, undefined, undefined, offset);
    TimeCallbackService.updateSunSet(new Date(1649602800000));
    cb.recalcNextToDo(new Date(1649602800000));
    expect(cb.nextToDo!.getTime()).toBe(1649613600000);
  });
});
