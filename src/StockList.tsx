import StockCard from './StockCard';
import { useSimulatorContext } from './SimulatorContext';

export default function StockList() {
  const { stocks } = useSimulatorContext();

  return (
    <div className="sim-stock-list">
      {stocks.map((stock, idx) => (
        <StockCard
          key={stock.symbol + idx}
          stock={stock}
          idx={idx}
        />
      ))}
    </div>
  );
}
