import { useState, useMemo } from 'react';
import './App.css';
import { Link } from 'react-router-dom';
import { parseCSV } from './csvParser';
import type { CSVTransaction } from './types';

const ITEMS_PER_PAGE = 20;

export default function PNLFromCSV() {
  const [transactions, setTransactions] = useState<CSVTransaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [enabledTypes, setEnabledTypes] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFilesCount, setLoadedFilesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get unique transaction types and initialize enabledTypes
  const transactionTypes = useMemo(() => {
    const types = new Set(transactions.map(t => t.type));
    const typesArray = Array.from(types).sort();
    
    // Initialize enabledTypes if not set
    if (Object.keys(enabledTypes).length === 0 && typesArray.length > 0) {
      const initial: Record<string, boolean> = {};
      typesArray.forEach(type => {
        initial[type] = true;
      });
      setEnabledTypes(initial);
      return typesArray;
    }
    
    return typesArray;
  }, [transactions, enabledTypes]);

  // Filter transactions based on enabled types
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => enabledTypes[t.type] !== false);
  }, [transactions, enabledTypes]);

  // Calculate totals
  const { profits, losses, net } = useMemo(() => {
    let profitsTotal = 0;
    let lossesTotal = 0;

    filteredTransactions.forEach(t => {
      if (t.amount > 0) {
        profitsTotal += t.amount;
      } else {
        lossesTotal += Math.abs(t.amount);
      }
    });

    return {
      profits: profitsTotal,
      losses: lossesTotal,
      net: profitsTotal - lossesTotal,
    };
  }, [filteredTransactions]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const processFiles = (files: File[]) => {
    const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
    if (csvFiles.length === 0) {
      setError('No CSV files found. Please select CSV files.');
      return;
    }

    setIsLoading(true);
    setError(null);
    let processedCount = 0;
    const allTransactions: CSVTransaction[] = [];
    const fileReaders: Promise<void>[] = [];

    csvFiles.forEach((file) => {
      const promise = new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            if (!text || text.trim().length === 0) {
              console.warn(`File ${file.name} is empty`);
              resolve();
              return;
            }
            const parsed = parseCSV(text);
            console.log(`Parsed ${parsed.length} transactions from ${file.name}`, parsed);
            allTransactions.push(...parsed);
            processedCount++;
            resolve();
          } catch (err) {
            console.error(`Error parsing file ${file.name}:`, err);
            reject(err);
          }
        };
        reader.onerror = (err) => {
          console.error(`Error reading file ${file.name}:`, err);
          reject(new Error(`Failed to read file: ${file.name}`));
        };
        reader.readAsText(file);
      });
      fileReaders.push(promise);
    });

    Promise.all(fileReaders)
      .then(() => {
        console.log(`Total transactions parsed: ${allTransactions.length}`);
        if (allTransactions.length === 0) {
          setError('No transactions found in CSV files. Please check the file format.');
        } else {
          setTransactions(allTransactions);
          setCurrentPage(1);
          setLoadedFilesCount(processedCount);
          // Reset enabled types
          const types = new Set(allTransactions.map(t => t.type));
          const initial: Record<string, boolean> = {};
          Array.from(types).forEach(type => {
            initial[type] = true;
          });
          setEnabledTypes(initial);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error processing files:', err);
        setError(`Error processing files: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input so the same files can be selected again
    e.target.value = '';
  };

  const toggleType = (type: string) => {
    setEnabledTypes(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Try to parse common date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

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
      <h2>PNL From CSV</h2>

      {/* File Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('csv-file-input')?.click();
        }}
        style={{
          border: `2px dashed ${isDragging ? '#667eea' : '#ccc'}`,
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: isDragging ? 'rgba(102, 126, 234, 0.05)' : 'var(--bg-secondary)',
          marginBottom: '2rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
      >
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileInput}
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          {isDragging ? 'Drop CSV files here' : 'Drag and drop CSV files here'}
        </p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          or click to browse (multiple files supported)
        </p>
        {isLoading && (
          <p style={{ marginTop: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            Loading files...
          </p>
        )}
        {error && (
          <p style={{ marginTop: '1rem', color: 'var(--error-text)', fontWeight: 600 }}>
            {error}
          </p>
        )}
        {transactions.length > 0 && !isLoading && (
          <p style={{ marginTop: '1rem', color: 'var(--success-text)', fontWeight: 600 }}>
            Loaded {transactions.length} transactions from {loadedFilesCount} file{loadedFilesCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Paginated Table */}
      {paginatedTransactions.length > 0 && (
        <>
          <div style={{ marginBottom: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-primary)' }}>Type</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((transaction, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                    }}
                  >
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                      {formatDate(transaction.date)}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                      {transaction.description}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                      {transaction.type}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem',
                        textAlign: 'right',
                        fontWeight: 600,
                        color: transaction.amount >= 0 ? 'var(--success-text)' : 'var(--error-text)',
                      }}
                    >
                      {formatCurrency(transaction.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="sim-btn"
                style={{ minWidth: 'auto', width: 'auto', padding: '0.5rem 1rem', flexShrink: 0 }}
              >
                Previous
              </button>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="sim-btn"
                style={{ minWidth: 'auto', width: 'auto', padding: '0.5rem 1rem', flexShrink: 0 }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Transaction Type Toggles */}
      {transactionTypes.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            Transaction Types
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {transactionTypes.map(type => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '2px solid',
                  borderColor: enabledTypes[type] ? '#667eea' : 'var(--border-color)',
                  backgroundColor: enabledTypes[type] ? 'rgba(102, 126, 234, 0.1)' : 'var(--bg-secondary)',
                  color: enabledTypes[type] ? '#667eea' : 'var(--text-secondary)',
                  fontWeight: enabledTypes[type] ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {type} {enabledTypes[type] ? '✓' : '✗'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      {filteredTransactions.length > 0 && (
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '2px solid var(--border-color)',
        }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
            Summary
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Revenue:
              </span>
              <span style={{ fontSize: '1.1rem', color: 'var(--success-text)', fontWeight: 700 }}>
                {formatCurrency(profits)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Expense:
              </span>
              <span style={{ fontSize: '1.1rem', color: 'var(--error-text)', fontWeight: 700 }}>
                {formatCurrency(losses)}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '0.75rem',
              borderTop: '2px solid var(--border-color)',
              marginTop: '0.5rem',
            }}>
              <span style={{ fontSize: '1.3rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                Net:
              </span>
              <span style={{
                fontSize: '1.3rem',
                color: net >= 0 ? 'var(--success-text)' : 'var(--error-text)',
                fontWeight: 800,
              }}>
                {formatCurrency(net)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
