export interface DTOCurrency {
  currencyCodeA: number;
  currencyCodeB: number;
  date: number;
  rateBuy: number;
  rateSell: number;
}

export interface DTOJar {
  amount: number;
  goal: number;
  ownerIcon: string;
  title: string;
  ownerName: string;
  currency: number;
  description: string;
  jarId: string;
  blago: boolean;
  closed: boolean;
}
