import type { Stock } from './types';
import { isOutsideOfMarketHours } from './utils';
import { ConfirmedButton } from './ConfirmedButton';
import { useSimulatorContext } from './SimulatorContext';

export default function StockCard({ stock, idx }: { stock: Stock; idx: number; }) {
    const { handlePriceChange, handlePriceBlur, sell, checkPrice, remove, isLoading, editingBuyPrice, editingSellPrice } = useSimulatorContext();
    const shares = stock.investmentAmount / stock.buyPrice;
    const currentValue = stock.soldPrice
        ? shares * stock.soldPrice
        : shares * (stock.currentPrice || stock.buyPrice);
    const gainLossRaw = stock.soldPrice
        ? currentValue - stock.investmentAmount
        : currentValue - stock.investmentAmount;
    const gainLoss = Math.round(gainLossRaw * 100) / 100;
    const gainLossPercentage = Math.round((gainLoss / stock.investmentAmount) * 10000) / 100;

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
                {stock.currentPrice && stock.soldPrice === undefined && (
                    <div className="sim-stock-current-price">
                        Current Price: ${stock.currentPrice.toFixed(2)}
                    </div>
                )}
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
                    <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                        <ConfirmedButton
                            className="sim-btn sim-delete-btn"
                            onClick={() => remove(idx)}
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
                            onClick={() => sell(idx)}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : 'Sell'}
                        </ConfirmedButton>
                        <button
                            className="sim-btn"
                            onClick={() => checkPrice(idx)}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : 'Check Price'}
                        </button>
                        <ConfirmedButton
                            className="sim-btn sim-delete-btn"
                            onClick={() => remove(idx)}
                            disabled={isLoading}
                        >
                            Delete
                        </ConfirmedButton>
                    </div>
                </div>
            )}
        </div>
    );
}
