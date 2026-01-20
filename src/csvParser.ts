import type { CSVTransaction } from './types';

export function parseCSV(csvText: string): CSVTransaction[] {
  // Normalize line endings and split
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length < 2) {
    return [];
  }

  // Parse header row properly handling quoted fields
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => {
    // Remove quotes, normalize whitespace, but preserve the exact header name for matching
    return h.trim().replace(/^"|"$/g, '').replace(/\s+/g, ' ');
  });
  
  // Create a normalized header map for flexible matching
  const headerMap = new Map<string, string>();
  headers.forEach(header => {
    const normalized = header.toLowerCase().trim();
    headerMap.set(normalized, header);
  });
  
  const transactions: CSVTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Handle CSV with quoted fields that may contain commas
    let values = parseCSVLine(line).map(v => v.trim().replace(/^"|"$/g, ''));
    
    // Handle trailing empty columns (some CSVs have empty columns at the end)
    // Pad with empty strings if we have fewer values than headers
    while (values.length < headers.length) {
      values.push('');
    }
    // Trim excess values if we have more than headers (shouldn't happen, but be safe)
    if (values.length > headers.length) {
      values = values.slice(0, headers.length);
    }
    
    if (values.length !== headers.length) {
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    // Detect format and parse accordingly (case-insensitive matching)
    const hasTransactionDate = headerMap.has('transaction date');
    const hasPostDate = headerMap.has('post date');
    const hasPostingDate = headerMap.has('posting date');
    const hasDetails = headerMap.has('details');
    
    if (hasTransactionDate && hasPostDate) {
      // Credit Card format
      const amountStr = (row['Amount'] || '0').replace(/,/g, '').trim();
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        continue;
      }
      const date = row['Transaction Date'] || row['Post Date'] || '';
      const transaction = {
        transactionDate: row['Transaction Date'],
        postDate: row['Post Date'],
        description: row['Description'] || '',
        category: row['Category'] || '',
        type: row['Type'] || '',
        amount,
        memo: row['Memo'] || '',
        date,
      };
      transactions.push(transaction);
    } else if (hasPostingDate && hasDetails) {
      // Savings/Checking format - use headerMap to get exact header names
      const amountKey = headerMap.get('amount') || 'Amount';
      const postingDateKey = headerMap.get('posting date') || 'Posting Date';
      const detailsKey = headerMap.get('details') || 'Details';
      const descriptionKey = headerMap.get('description') || 'Description';
      const typeKey = headerMap.get('type') || 'Type';
      const balanceKey = headerMap.get('balance') || 'Balance';
      const checkOrSlipKey = headers.find(h => h.toLowerCase().includes('check') || h.toLowerCase().includes('slip')) || 'Check or Slip #';
      
      const amountStr = (row[amountKey] || '0').replace(/,/g, '').trim();
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        continue;
      }
      const date = row[postingDateKey] || '';
      const transaction = {
        details: row[detailsKey] || '',
        postingDate: row[postingDateKey] || '',
        description: row[descriptionKey] || '',
        amount,
        type: row[typeKey] || '',
        balance: row[balanceKey] || '',
        checkOrSlip: row[checkOrSlipKey] || '',
        date,
      };
      transactions.push(transaction);
    } else {
      // Try to parse as generic CSV if it has Amount and Type columns
      const hasAmount = headerMap.has('amount');
      const hasType = headerMap.has('type');
      if (hasAmount && hasType) {
        const amountKey = headerMap.get('amount') || 'Amount';
        const typeKey = headerMap.get('type') || 'Type';
        const amountStr = (row[amountKey] || '0').replace(/,/g, '').trim();
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) {
          const dateField = headers.find(h => h.toLowerCase().includes('date')) || '';
          const descField = headers.find(h => h.toLowerCase().includes('description')) || 'Description';
          transactions.push({
            description: row[descField] || '',
            type: row[typeKey] || '',
            amount,
            date: row[dateField] || '',
          });
        }
      }
    }
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values;
}
