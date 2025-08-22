export interface Stock {
  symbol: string;
  buyPrice: number;
  investmentAmount: number;
  soldPrice?: number;
  buyDate: string;
  sellDate?: string;
  currentPrice?: number;
}
