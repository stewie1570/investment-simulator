import { useState } from 'react';
import { useSimulatorContext } from './SimulatorContext';

export default function BuyForm() {
  const { buy, isLoading, apiKey } = useSimulatorContext();
  const [input, setInput] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState(100);

  return (
    <>
      <div className="sim-input-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'right' }}>
        <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Symbol
          <input
            className="sim-input"
            placeholder="ENTER STOCK SYMBOL"
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && buy(input.trim().toUpperCase(), investmentAmount)}
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
            style={{ marginLeft: 0, textAlign: 'right' }}
          />
        </label>
      </div>
      <div className="sim-input-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'left', marginBottom: '3rem' }}>
        <button
          className="sim-btn"
          onClick={() => buy(input.trim().toUpperCase(), investmentAmount)}
          disabled={isLoading || !apiKey}
        >
          {isLoading ? 'Loading...' : 'Buy'}
        </button>
      </div>
    </>
  );
}
