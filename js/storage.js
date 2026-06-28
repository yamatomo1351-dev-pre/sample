/**
 * Storage module - localStorage persistence + JSON/CSV import/export
 */
const Storage = (() => {
  const STORAGE_KEY = 'kakeibo_data';

  const DEFAULT_CATEGORIES = {
    expense: [
      { id: 'cat_food', name: '食費', color: '#e74c3c', icon: '🍽️' },
      { id: 'cat_transport', name: '交通費', color: '#3498db', icon: '🚃' },
      { id: 'cat_daily', name: '日用品', color: '#9b59b6', icon: '🧴' },
      { id: 'cat_entertainment', name: '娯楽', color: '#f39c12', icon: '🎮' },
      { id: 'cat_medical', name: '医療', color: '#1abc9c', icon: '💊' },
      { id: 'cat_other_exp', name: 'その他', color: '#95a5a6', icon: '📦' }
    ],
    income: [
      { id: 'cat_salary', name: '給与', color: '#27ae60', icon: '💰' },
      { id: 'cat_bonus', name: 'ボーナス', color: '#2ecc71', icon: '🎁' },
      { id: 'cat_other_inc', name: 'その他', color: '#16a085', icon: '💵' }
    ]
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        return {
          categories: data.categories || DEFAULT_CATEGORIES,
          transactions: data.transactions || []
        };
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
    return {
      categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
      transactions: []
    };
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function exportJson(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `kakeibo_${formatDateFile(new Date())}.json`);
  }

  function exportCsv(data) {
    const { categories, transactions } = data;
    const catMap = {};
    [...categories.expense, ...categories.income].forEach(c => {
      catMap[c.id] = c.name;
    });

    const header = 'id,date,type,category_id,category_name,amount,memo';
    const rows = transactions.map(t => {
      const memo = (t.memo || '').replace(/"/g, '""');
      return [
        t.id,
        t.date,
        t.type,
        t.categoryId,
        catMap[t.categoryId] || '',
        t.amount,
        `"${memo}"`
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, `kakeibo_${formatDateFile(new Date())}.csv`);
  }

  function importJson(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          resolve(imported);
        } catch (err) {
          reject(new Error('JSONファイルの形式が正しくありません'));
        }
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsText(file);
    });
  }

  function importCsv(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result.replace(/^\uFEFF/, '');
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          if (lines.length < 2) {
            reject(new Error('CSVファイルにデータがありません'));
            return;
          }

          const transactions = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = parseCsvLine(lines[i]);
            if (cols.length < 6) continue;

            transactions.push({
              id: cols[0] || generateId('tx'),
              date: cols[1],
              type: cols[2],
              categoryId: cols[3],
              amount: parseInt(cols[5], 10) || 0,
              memo: cols[6] ? cols[6].replace(/^"|"$/g, '').replace(/""/g, '"') : ''
            });
          }
          resolve({ transactions });
        } catch (err) {
          reject(new Error('CSVファイルの形式が正しくありません'));
        }
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsText(file);
    });
  }

  function parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  function mergeImport(existing, imported) {
    const merged = {
      categories: { ...existing.categories },
      transactions: [...existing.transactions]
    };

    if (imported.categories) {
      if (imported.categories.expense) {
        merged.categories.expense = mergeCategories(
          existing.categories.expense,
          imported.categories.expense
        );
      }
      if (imported.categories.income) {
        merged.categories.income = mergeCategories(
          existing.categories.income,
          imported.categories.income
        );
      }
    }

    if (imported.transactions) {
      const existingIds = new Set(existing.transactions.map(t => t.id));
      imported.transactions.forEach(t => {
        if (!existingIds.has(t.id)) {
          merged.transactions.push(t);
          existingIds.add(t.id);
        }
      });
    }

    return merged;
  }

  function mergeCategories(existing, imported) {
    const existingIds = new Set(existing.map(c => c.id));
    const result = [...existing];
    imported.forEach(c => {
      if (!existingIds.has(c.id)) {
        result.push(c);
        existingIds.add(c.id);
      }
    });
    return result;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function formatDateFile(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  return {
    load,
    save,
    generateId,
    exportJson,
    exportCsv,
    importJson,
    importCsv,
    mergeImport,
    DEFAULT_CATEGORIES
  };
})();
