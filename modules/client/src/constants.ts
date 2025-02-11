export type CsvFile = {
  name: string; // eg coinbase.csv
  type: any; // CsvSource eg Coinbase or a csv parser
  data: string; // raw csv data eg "col1,col2\nrow1,row2\n"
};

export const getEmptyCsv = (): CsvFile[] => [];
