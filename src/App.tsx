import './App.css'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { SimulatorProvider, useSimulatorContext } from './SimulatorContext';
import ApiKeyInput from './ApiKeyInput';
import BuyForm from './BuyForm';
import Totals from './Totals';
import StockList from './StockList';
import PNLFromCSV from './PNLFromCSV';

function InnerApp() {
  const { error } = useSimulatorContext();

  return (
    <div className="sim-container">
      <nav style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ marginRight: '20px', textDecoration: 'none', color: '#646cff' }}>
          Trade Simulator
        </Link>
        <Link to="/pnl-from-csv" style={{ textDecoration: 'none', color: '#646cff' }}>
          PNL From CSV
        </Link>
      </nav>
      <h2>Trade Simulator</h2>
      <ApiKeyInput />
      <BuyForm />
      {error && <div className="sim-error">{error}</div>}

      <Totals />

      <StockList />
    </div>
  );
}

function TradeSimulatorPage() {
  return (
    <SimulatorProvider>
      <InnerApp />
    </SimulatorProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TradeSimulatorPage />} />
        <Route path="/pnl-from-csv" element={<PNLFromCSV />} />
      </Routes>
    </BrowserRouter>
  );
}
