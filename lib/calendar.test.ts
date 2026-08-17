import {
  addisNoon,
  civilParts,
  ethiopianToGregorian,
  formatCivilYmd,
  formatDateWithSystem,
  formatEthiopianDate,
  gregorianToEthiopian,
  gregorianToJdn,
  jdnToEthiopic,
  weekdayPair,
} from "./calendar";

/**
 * Golden pairs from ICU `en-US-u-ca-ethiopic` in Africa/Addis_Ababa.
 * Do not "fix" failures with ±1 day.
 */
const GOLDEN: Array<{
  name: string;
  gc: [number, number, number];
  ec: [number, number, number];
  weekday: string;
}> = [
  { name: "2026-08-17 = Nehase 11 2018 Monday", gc: [2026, 8, 17], ec: [2018, 12, 11], weekday: "Monday" },
  { name: "2025-09-11 = Meskerem 1 2018 Thursday", gc: [2025, 9, 11], ec: [2018, 1, 1], weekday: "Thursday" },
  { name: "2024-09-11 = Meskerem 1 2017 Wednesday", gc: [2024, 9, 11], ec: [2017, 1, 1], weekday: "Wednesday" },
  { name: "2023-09-12 = Meskerem 1 2016 Tuesday", gc: [2023, 9, 12], ec: [2016, 1, 1], weekday: "Tuesday" },
  { name: "2023-09-11 = Pagume 6 2015 Monday", gc: [2023, 9, 11], ec: [2015, 13, 6], weekday: "Monday" },
  { name: "2026-09-06 = Pagume 1 2018 Sunday", gc: [2026, 9, 6], ec: [2018, 13, 1], weekday: "Sunday" },
  { name: "2026-09-11 = Meskerem 1 2019 Friday", gc: [2026, 9, 11], ec: [2019, 1, 1], weekday: "Friday" },
  { name: "2007-09-12 = Meskerem 1 2000 Wednesday", gc: [2007, 9, 12], ec: [2000, 1, 1], weekday: "Wednesday" },
];

function ymd(t: [number, number, number]) {
  return { year: t[0], month: t[1], day: t[2] };
}

describe("ICU / JDN Ethiopian calendar", () => {
  test.each(GOLDEN)("$name", ({ gc, ec, weekday }) => {
      const [gy, gm, gd] = gc;
      const [ey, em, ed] = ec;
      const instant = addisNoon(gy, gm, gd);

      const converted = gregorianToEthiopian(instant);
      expect(converted).toEqual({ year: ey, month: em, day: ed });

      const icu = jdnToEthiopic(gregorianToJdn(gy, gm, gd));
      expect(icu).toEqual({ year: ey, month: em, day: ed });

      const days = new Intl.DateTimeFormat("en-US-u-ca-ethiopic", {
        weekday: "long",
        timeZone: "Africa/Addis_Ababa",
      }).format(instant);
      expect(days).toBe(weekday);

      const pair = weekdayPair(instant);
      expect(pair.gc).toBe(weekday);
      expect(pair.ec).toBe(weekday);
    });

  test("round-trip GC → EC → GC is identity", () => {
    for (const { gc, ec } of GOLDEN) {
      const back = ethiopianToGregorian(ymd(ec));
      const parts = civilParts(back);
      expect(parts).toEqual(ymd(gc));
    }
  });

  test("date-only YYYY-MM-DD is Addis civil, not UTC midnight", () => {
    const converted = gregorianToEthiopian("2026-08-17");
    expect(converted).toEqual({ year: 2018, month: 12, day: 11 });
    expect(formatCivilYmd("2026-08-17")).toBe("2026-08-17");
  });

  test("EC display for 2026-08-17 is Nehase 11 Monday, not Sunday", () => {
    const formatted = formatDateWithSystem("ec", "2026-08-17");
    expect(formatted).toContain("ነሐሴ");
    expect(formatted).toContain("11");
    expect(formatted).toContain("2018");
    expect(formatted).toContain("ሰኞ");
    expect(formatted).not.toContain("እሑድ");
  });

  test("does not invent a ±1 day offset", () => {
    const actual = gregorianToEthiopian("2026-08-17");
    expect(formatEthiopianDate(actual)).toBe("2018-12-11");
    expect(formatEthiopianDate({ year: 2018, month: 12, day: 10 })).not.toBe(
      formatEthiopianDate(actual),
    );
  });

  test("missing dates format as an em dash", () => {
    expect(formatDateWithSystem("gc", undefined)).toBe("—");
    expect(formatDateWithSystem("ec", null)).toBe("—");
    expect(formatDateWithSystem("gc", "")).toBe("—");
  });
});
