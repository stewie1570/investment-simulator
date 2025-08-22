import { useSimulatorContext } from './SimulatorContext';

export default function ApiKeyInput() {
  const { apiKey, setApiKey } = useSimulatorContext();

  return (
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
      <a href="https://finnhub.io/" style={{ marginTop: '2rem' }} target="_blank" rel="noopener noreferrer">
        Get your API key here
      </a>
    </div>
  );
}
