import { useSimulatorContext } from './SimulatorContext';
import { ConfirmedButton } from './ConfirmedButton';

export default function Totals() {
  const { calculateTotalGainLoss, runningTotal, setRunningTotal, isLoading } = useSimulatorContext();
  const gainLoss = calculateTotalGainLoss();

  return (
    <>
      <table
        className="sim-total-gainloss-table"
        style={{ marginBottom: '2rem', width: '100%' }}
      >
        <tbody>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Board Gain/Loss:</td>
            <td>
              <span className={gainLoss >= 0 ? 'sim-gain' : 'sim-loss'}
                style={{ display: 'inline-block', textAlign: 'right', minWidth: 80 }}>
                ${gainLoss.toFixed(2)}
              </span>
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold' }}>Running Total:</td>
            <td>
              <span
                className={(runningTotal || 0) >= 0 ? 'sim-gain' : 'sim-loss'}
                style={{ display: 'inline-block', textAlign: 'right', minWidth: 80 }}>
                ${(runningTotal || 0)?.toFixed(2) || '0.00'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <ConfirmedButton
        className="sim-btn sim-reset-btn"
        style={{ marginBottom: '2rem' }}
        onClick={() => setRunningTotal(0)}
        disabled={isLoading}
      >
        Reset Running Total
      </ConfirmedButton>
    </>
  );
}
