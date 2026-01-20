import type { CSVTransaction } from './types';

export function parseCSV(csvText: string): CSVTransaction[] {
  // Normalize line endings and split
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length < 2) {
    console.warn('CSV has less than 2 lines');
    return [];
  }

  // Parse header row properly handling quoted fields
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map(h => {
    // Remove quotes, normalize whitespace, but preserve the exact header name for matching
    return h.trim().replace(/^"|"$/g, '').replace(/\s+/g, ' ');
  });
  console.log('Parsed headers:', headers);
  console.log('Number of header columns:', headers.length);
  console.log('First few lines:', lines.slice(0, 3));
  
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
    
    // Debug first data line
    if (i === 1) {
      console.log(`First data line raw: "${line}"`);
      console.log(`Parsed values (${values.length}):`, values);
      console.log(`Headers (${headers.length}):`, headers);
    }
    
    // Handle trailing empty columns (some CSVs have empty columns at the end)
    // Pad with empty strings if we have fewer values than headers
    while (values.length < headers.length) {
      values.push('');
    }
    // Trim excess values if we have more than headers (shouldn't happen, but be safe)
    if (values.length > headers.length) {
      console.warn(`Line ${i + 1}: More values than headers. Trimming excess. Had ${values.length}, expected ${headers.length}`);
      values = values.slice(0, headers.length);
    }
    
    if (values.length !== headers.length) {
      console.warn(`Line ${i + 1}: Column count mismatch after normalization. Expected ${headers.length}, got ${values.length}`);
      console.warn(`Headers: ${headers.join('|')}`);
      console.warn(`Values: ${values.join('|')}`);
      console.warn(`Full line: ${line}`);
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
    
    if (i === 1) {
      console.log('Format detection:', {
        hasTransactionDate,
        hasPostDate,
        hasPostingDate,
        hasDetails,
        headers,
        headerMapKeys: Array.from(headerMap.keys())
      });
    }
    
    if (hasTransactionDate && hasPostDate) {
      console.log('Detected Credit Card format');
      // Credit Card format
      const amountStr = (row['Amount'] || '0').replace(/,/g, '').trim();
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        console.warn(`Line ${i + 1}: Invalid amount "${row['Amount']}" (parsed as "${amountStr}")`);
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
      console.log(`Added transaction: ${transaction.description} - ${transaction.type} - ${transaction.amount}`);
    } else if (hasPostingDate && hasDetails) {
      console.log('Detected Savings/Checking format');
      console.log(`Line ${i + 1} row data:`, row);
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
        console.warn(`Line ${i + 1}: Invalid amount "${row[amountKey]}" (parsed as "${amountStr}")`);
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
      console.log(`Added transaction: ${transaction.description} - ${transaction.type} - ${transaction.amount}`);
    } else {
      console.warn(`Line ${i + 1}: Unknown CSV format. Headers: ${headers.join(', ')}`);
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
          console.log(`Added generic transaction: ${row[descField]} - ${row[typeKey]} - ${amount}`);
        }
      }
    }
  }

  console.log(`Parsed ${transactions.length} transactions`);
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
