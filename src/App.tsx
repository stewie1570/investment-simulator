import './App.css'
import { SimulatorProvider, useSimulatorContext } from './SimulatorContext';
import ApiKeyInput from './ApiKeyInput';
import BuyForm from './BuyForm';
import Totals from './Totals';
import StockList from './StockList';

function InnerApp() {
  const { error } = useSimulatorContext();

  return (
    <div className="sim-container">
      <h2>Trade Simulator</h2>
      <ApiKeyInput />
      <BuyForm />
      {error && <div className="sim-error">{error}</div>}

      <Totals />

      <StockList />
    </div>
  );
}

export default function App() {
  return (
    <SimulatorProvider>
      <InnerApp />
    </SimulatorProvider>
  );
}
