import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SimulatorProvider, useSimulatorContext } from './SimulatorContext';
import ApiKeyInput from './ApiKeyInput';
import BuyForm from './BuyForm';
import Totals from './Totals';
import StockList from './StockList';
import PNLFromCSV from './PNLFromCSV';
import RetirementCalculator from './RetirementCalculator';
import AppNav from './AppNav';

function InnerApp() {
  const { error } = useSimulatorContext();

  return (
    <div className="sim-container">
      <AppNav />
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
        <Route path="/retirement" element={<RetirementCalculator />} />
      </Routes>
    </BrowserRouter>
  );
}
