import { CsvTable } from './csv-table';
import { MoneyText } from './money-text';

describe('CsvTable', () => {
  it('quotes cells with commas, quotes or line breaks and joins lines with CRLF', () => {
    expect(
      CsvTable.of(
        ['a', 'b'],
        [
          ['1,2', 'say "hi"'],
          ['x\ny', 'plain'],
        ],
      ),
    ).toBe('a,b\r\n"1,2","say ""hi"""\r\n"x\ny",plain');
  });

  it('keeps text that looks like a formula as text', () => {
    expect(CsvTable.cell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(CsvTable.cell('-1')).toBe("'-1");
    expect(CsvTable.cell('@user')).toBe("'@user");
  });
});

describe('MoneyText', () => {
  it('writes minor units in the major unit with the currency decimals', () => {
    expect(MoneyText.major(880, 'GBP')).toBe('8.80');
    expect(MoneyText.major(500, 'JPY')).toBe('500');
    expect(MoneyText.withCode(1234, 'EUR')).toBe('EUR 12.34');
  });
});
