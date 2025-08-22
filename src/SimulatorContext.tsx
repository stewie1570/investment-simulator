import { useState, useEffect } from 'react';
import { createManagedContext, useLocalStorageState } from 'leaf-validator';
import type { Stock } from './types';

const useSimulator = () => {
  const [runningTotal, setRunningTotal] = useLocalStorageState<number | undefined>('runningTotal');
  const [stocks, setStocks] = useState<Stock[]>(() => {
    const savedStocks = localStorage.getItem('stocks');
    return savedStocks ? JSON.parse(savedStocks) : [];
  });

  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('finnhubApiKey') || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBuyPrice, setEditingBuyPrice] = useState<{ value: string; idx: number } | null>(null);
  const [editingSellPrice, setEditingSellPrice] = useState<{ value: string; idx: number } | null>(null);

  useEffect(() => {
    localStorage.setItem('stocks', JSON.stringify(stocks));
  }, [stocks]);

  useEffect(() => {
    localStorage.setItem('finnhubApiKey', apiKey);
  }, [apiKey]);

  const fetchStockPrice = async (symbol: string): Promise<number> => {
    if (!apiKey) {
      throw new Error('Please enter your Finnhub API key');
    }
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
      );
      const data = await response.json();

      if (data.c) {
        return data.c; // current price
      }
      throw new Error('Invalid stock symbol or API response');
    } catch (err) {
      throw new Error('Failed to fetch stock price');
    }
  };

  const buy = async (symbol: string, investmentAmount: number) => {
    if (!symbol || !symbol.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const currentPrice = await fetchStockPrice(symbol);
      setStocks(s => [
        {
          symbol,
          buyPrice: currentPrice,
          investmentAmount,
          buyDate: new Date().toISOString(),
          currentPrice
        },
        ...s,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock price');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sell = async (idx: number) => {
    const stock = stocks[idx];
    setIsLoading(true);
    setError(null);
    try {
      const currentPrice = await fetchStockPrice(stock.symbol);
      setStocks(s =>
        s.map((st, i) => (i === idx && st.soldPrice === undefined ? { ...st, soldPrice: currentPrice, sellDate: new Date().toISOString() } : st))
      );
      const gainOrLoss = (currentPrice - stock.buyPrice) * (stock.investmentAmount / stock.buyPrice);
      setRunningTotal((runningTotal || 0) + gainOrLoss);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock price');
    } finally {
      setIsLoading(false);
    }
  };

  const remove = (idx: number) => {
    setStocks(s => s.filter((_, i) => i !== idx));
  };

  const calculateTotalGainLoss = () => {
    const result = stocks.reduce((total, stock) => {
      const shares = stock.investmentAmount / stock.buyPrice;
      const currentValue = stock.soldPrice ? shares * stock.soldPrice : shares * stock.buyPrice;
      const gainLoss = currentValue - stock.investmentAmount;
      return total + gainLoss;
    }, 0);
    return Math.round(result * 100) / 100;
  };

  const handlePriceChange = (value: string, isBuyPrice: boolean, idx: number) => {
    if (!/^\d*\.?\d*$/.test(value)) return;
    if (isBuyPrice) {
      setEditingBuyPrice({ value, idx });
    } else {
      setEditingSellPrice({ value, idx });
    }
  };

  const handlePriceBlur = (isBuyPrice: boolean, idx: number) => {
    if (isBuyPrice && editingBuyPrice !== null && editingBuyPrice.idx === idx) {
      const numValue = parseFloat(editingBuyPrice.value);
      if (!isNaN(numValue)) {
        setStocks(s => s.map((stock, i) => (i === idx ? { ...stock, buyPrice: Number(numValue.toFixed(2)) } : stock)));
      }
      setEditingBuyPrice(null);
    } else if (!isBuyPrice && editingSellPrice !== null && editingSellPrice.idx === idx) {
      const numValue = parseFloat(editingSellPrice.value);
      if (!isNaN(numValue)) {
        setStocks(s => s.map((stock, i) => (i === idx ? { ...stock, soldPrice: Number(numValue.toFixed(2)) } : stock)));
      }
      setEditingSellPrice(null);
    }
  };

  const checkPrice = async (idx: number) => {
    const stock = stocks[idx];
    setIsLoading(true);
    setError(null);
    try {
      const currentPrice = await fetchStockPrice(stock.symbol);
      setStocks(s => s.map((st, i) => (i === idx ? { ...st, currentPrice } : st)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock price');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    runningTotal,
    setRunningTotal,
    stocks,
    apiKey,
    setApiKey,
    isLoading,
    error,
    editingBuyPrice,
    editingSellPrice,
    buy,
    sell,
    remove,
    checkPrice,
    calculateTotalGainLoss,
    handlePriceChange,
    handlePriceBlur,
    setEditingBuyPrice,
    setEditingSellPrice,
  };
};

const [SimulatorProvider, useSimulatorContext] = createManagedContext(useSimulator);

export { SimulatorProvider, useSimulatorContext };
