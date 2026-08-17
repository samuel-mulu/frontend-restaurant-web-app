/**
 * Compatibility re-exports. All conversion goes through lib/calendar.ts
 * (ICU / JDN epoch 1723856). Do not add a second algorithm here.
 */
export {
  addEthiopianMonths,
  daysBetweenEthiopianDates,
  ethiopianToGregorian,
  formatEthiopianDate,
  formatEthiopianDateReadable,
  getCurrentEthiopianDate,
  getEthiopianMonthName,
  gregorianToEthiopian,
  parseEthiopianDate,
  type EthiopianDate,
  type GregorianDate,
} from "../calendar";
