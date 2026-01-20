export interface Stock {
  symbol: string;
  buyPrice: number;
  investmentAmount: number;
  soldPrice?: number;
  buyDate: string;
  sellDate?: string;
  currentPrice?: number;
}

export interface CSVTransaction {
  // Credit Card format fields
  transactionDate?: string;
  postDate?: string;
  description: string;
  category?: string;
  type: string;
  amount: number;
  memo?: string;
  // Savings/Checking format fields
  details?: string;
  postingDate?: string;
  balance?: string;
  checkOrSlip?: string;
  // Common fields
  date: string; // Normalized date field
}
