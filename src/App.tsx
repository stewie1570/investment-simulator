import { useState, useEffect } from 'react'
import './App.css'
import { ConfirmedButton } from './ConfirmedButton';

interface Stock {
  symbol: string;
  buyPrice: number;
  investmentAmount: number;
  soldPrice?: number;
  buyDate: string;
  sellDate?: string;
  currentPrice?: number;
}

function isOutsideOfMarketHours(dateString: string) {
  const date = new Date(dateString);
  const utcHour = date.getUTCHours();
  const utcMinute = date.getUTCMinutes();
  const estHour = utcHour - 5;
  const estMinute = utcMinute;
  const minutes = estHour * 60 + estMinute;
  return minutes < 510 || minutes >= 900;
}

function App() {
  const [stocks, setStocks] = useState<Stock[]>(() => {
    const savedStocks = localStorage.getItem('stocks');
    return savedStocks ? JSON.parse(savedStocks) : [];
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('finnhubApiKey') || '';
  });
  const [input, setInput] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState(100);
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

  const handleBuy = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const symbol = input.trim().toUpperCase();
      const currentPrice = await fetchStockPrice(symbol);

      setStocks([
        ...stocks,
        {
          symbol,
          buyPrice: currentPrice,
          investmentAmount: investmentAmount,
          buyDate: new Date().toISOString()
        },
      ]);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock price');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSell = async (idx: number) => {
    const stock = stocks[idx];
    setIsLoading(true);
    setError(null);

    try {
      const currentPrice = await fetchStockPrice(stock.symbol);
      setStocks(stocks =>
        stocks.map((s, i) =>
          i === idx && s.soldPrice === undefined
            ? { ...s, soldPrice: currentPrice, sellDate: new Date().toISOString() }
            : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock price');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (idx: number) => {
    setStocks(stocks => stocks.filter((_, i) => i !== idx));
  };

  const calculateTotalGainLoss = () => {
    return stocks.reduce((total, stock) => {
      const shares = stock.investmentAmount / stock.buyPrice;
      const currentValue = stock.soldPrice
        ? shares * stock.soldPrice
        : shares * stock.buyPrice;
      const gainLoss = stock.soldPrice
        ? currentValue - stock.investmentAmount
        : currentValue - stock.investmentAmount;
      return total + gainLoss;
    }, 0);
  };

  const handlePriceChange = (value: string, isBuyPrice: boolean, idx: number) => {
    // Only allow digits and decimal point
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
        setStocks(stocks => stocks.map((stock, i) =>
          i === idx ? { ...stock, buyPrice: Number(numValue.toFixed(2)) } : stock
        ));
      }
      setEditingBuyPrice(null);
    } else if (!isBuyPrice && editingSellPrice !== null && editingSellPrice.idx === idx) {
      const numValue = parseFloat(editingSellPrice.value);
      if (!isNaN(numValue)) {
        setStocks(stocks => stocks.map((stock, i) =>
          i === idx ? { ...stock, soldPrice: Number(numValue.toFixed(2)) } : stock
        ));
      }
      setEditingSellPrice(null);
    }
  };

  const handleCheckPrice = async (idx: number) => {
    const stock = stocks[idx];
    setIsLoading(true);
    setError(null);

    try {
      const currentPrice = await fetchStockPrice(stock.symbol);

      // Update the stock's current value without marking it as sold
      setStocks(stocks =>
        stocks.map((s, i) =>
          i === idx ? { ...s, currentPrice } : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stock price');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sim-container">
      <h2>Trade Simulator UI</h2>
      <div className="sim-input-row">
        <label style={{ fontWeight: 'bold' }}>Finnhub API Key:
          <input
            className="sim-input"
            placeholder="ENTER FINNHUB API KEY"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            type="password"
          />
        </label>
      </div>
      <div className="sim-input-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'right' }}>
        <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Symbol
          <input
            className="sim-input"
            placeholder="ENTER STOCK SYMBOL"
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleBuy()}
            disabled={isLoading || !apiKey}
          />
        </label>
        <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          $
          <input
            className="sim-input"
            type="number"
            min={1}
            step={1}
            value={investmentAmount}
            onChange={e => {
              setInvestmentAmount(parseInt(e.target.value));
            }}
            placeholder="Investment Amount"
            disabled={isLoading}
            style={{ marginLeft: 0 }}
          />
        </label>
      </div>
      <div className="sim-input-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'left', marginBottom: '3rem' }}>
        <button
          className="sim-btn"
          onClick={handleBuy}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Buy'}
        </button>
      </div>
      {error && <div className="sim-error">{error}</div>}

      <div className="sim-total-gainloss">
        Total Gain/Loss: ${calculateTotalGainLoss().toFixed(2)}
      </div>

      <div className="sim-stock-list">
        {stocks.map((stock, idx) => {
          const shares = stock.investmentAmount / stock.buyPrice;
          const currentValue = stock.soldPrice
            ? shares * stock.soldPrice
            : shares * (stock.currentPrice || stock.buyPrice);
          const gainLoss = stock.soldPrice
            ? currentValue - stock.investmentAmount
            : currentValue - stock.investmentAmount;
          const gainLossPercentage = (gainLoss / stock.investmentAmount) * 100;

          return (
            <div className="sim-stock-card" key={stock.symbol + idx}>
              <div>
                <div className="sim-stock-symbol">
                  {stock.symbol}
                  {stock.soldPrice === undefined && (
                    <span className={gainLoss >= 0 ? 'sim-gain' : 'sim-loss'} style={{ marginLeft: '10px', fontSize: '0.9em' }}>
                      ${gainLoss.toFixed(2)} ({gainLossPercentage.toFixed(2)}%)
                    </span>
                  )}
                </div>
                <div className="sim-stock-buy">
                  Buy Price: $
                  <input
                    type="text"
                    value={editingBuyPrice !== null && editingBuyPrice.idx === idx
                      ? editingBuyPrice.value
                      : stock.buyPrice.toFixed(2)}
                    onChange={(e) => handlePriceChange(e.target.value, true, idx)}
                    onBlur={() => handlePriceBlur(true, idx)}
                    className="sim-price-input"
                  />
                </div>
                <div className="sim-stock-investment">Investment: ${stock.investmentAmount}</div>
                <div className="sim-stock-shares">Shares: {shares.toFixed(4)}</div>
                <div className="sim-stock-date">
                  Bought: {new Date(stock.buyDate).toLocaleString()}
                </div>
                {isOutsideOfMarketHours(stock.buyDate) && (
                  <div style={{ color: 'red', fontWeight: 'bold', marginTop: 4 }}>
                    After Hours
                  </div>
                )}
              </div>
              {stock.soldPrice !== undefined ? (
                <div className="sim-sold">
                  <div>
                    Sold at: $
                    <input
                      type="text"
                      value={editingSellPrice !== null && editingSellPrice.idx === idx
                        ? editingSellPrice.value
                        : stock.soldPrice!.toFixed(2)}
                      onChange={(e) => handlePriceChange(e.target.value, false, idx)}
                      onBlur={() => handlePriceBlur(false, idx)}
                      className="sim-price-input"
                    />
                  </div>
                  <div>Sold: {new Date(stock.sellDate!).toLocaleString()}</div>
                  <div className={gainLoss >= 0 ? 'sim-gain' : 'sim-loss'}>
                    {gainLoss >= 0 ? 'Gain' : 'Loss'}: ${Math.abs(gainLoss).toFixed(2)} ({gainLossPercentage.toFixed(2)}%)
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <ConfirmedButton
                      className="sim-btn sim-delete-btn"
                      onClick={() => handleDelete(idx)}
                      disabled={isLoading}
                    >
                      Delete
                    </ConfirmedButton>
                  </div>
                </div>
              ) : (
                <div className="sim-current">
                  <div>Current Value: ${currentValue.toFixed(2)}</div>
                  <div className="sim-button-group">
                    <ConfirmedButton
                      className="sim-btn"
                      onClick={() => handleSell(idx)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Loading...' : 'Sell'}
                    </ConfirmedButton>
                    <button
                      className="sim-btn"
                      onClick={() => handleCheckPrice(idx)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Loading...' : 'Check Price'}
                    </button>
                    <ConfirmedButton
                      className="sim-btn sim-delete-btn"
                      onClick={() => handleDelete(idx)}
                      disabled={isLoading}
                    >
                      Delete
                    </ConfirmedButton>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App
