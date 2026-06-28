/**
 * Main application
 */
(() => {
  let data = Storage.load();
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let selectedDate = null;
  let categoryTabType = 'expense';
  let transactionType = 'expense';

  const COLORS = ['#e74c3c', '#3498db', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22', '#2ecc71', '#34495e', '#d35400', '#16a085'];
  const ICONS = ['🍽️', '🚃', '🧴', '🎮', '💊', '📦', '💰', '🎁', '💵', '🏠', '👕', '📱', '✈️', '📚', '☕', '🛒'];

  const VIEW_TITLES = {
    dashboard: 'ダッシュボード',
    records: '記録一覧',
    categories: 'カテゴリ',
    charts: 'グラフ',
    data: 'データ管理'
  };

  // DOM refs
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function init() {
    setupNavigation();
    setupMonthSelector();
    setupTransactionForm();
    setupCategoryForm();
    setupDataManagement();
    setupModals();
    setupColorIconPickers();
    renderAll();
  }

  function setupNavigation() {
    $$('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        switchView(btn.dataset.view);
      });
    });

    $('#fabAdd').addEventListener('click', () => {
      openTransactionModal();
    });
  }

  function switchView(viewName) {
    $$('.view').forEach(v => v.classList.remove('active'));
    $$('.nav-item').forEach(n => n.classList.remove('active'));

    $(`#view-${viewName}`).classList.add('active');
    $(`.nav-item[data-view="${viewName}"]`).classList.add('active');
    $('#pageTitle').textContent = VIEW_TITLES[viewName];

    const showFab = ['dashboard', 'records'].includes(viewName);
    $('#fabAdd').classList.toggle('hidden', !showFab);

    if (viewName === 'charts') {
      renderCharts();
    }
  }

  function setupMonthSelector() {
    $('#prevMonth').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderAll();
    });

    $('#nextMonth').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderAll();
    });
  }

  function setupTransactionForm() {
    $$('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        transactionType = btn.dataset.type;
        $$('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateCategorySelect('transactionCategory', transactionType);
      });
    });

    $('#transactionForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveTransaction();
    });

    $('#deleteTransaction').addEventListener('click', () => {
      const id = $('#transactionId').value;
      if (id && confirm('この記録を削除しますか？')) {
        data.transactions = data.transactions.filter(t => t.id !== id);
        persist();
        closeModal('transactionModal');
        renderAll();
        showToast('記録を削除しました');
      }
    });

    $('#filterType').addEventListener('change', renderRecords);
    $('#filterCategory').addEventListener('change', renderRecords);
  }

  function setupCategoryForm() {
    $$('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        categoryTabType = tab.dataset.type;
        $$('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderCategories();
      });
    });

    $('#addCategoryBtn').addEventListener('click', () => {
      openCategoryModal();
    });

    $('#categoryForm').addEventListener('submit', (e) => {
      e.preventDefault();
      saveCategory();
    });

    $('#deleteCategory').addEventListener('click', () => {
      const id = $('#categoryId').value;
      if (id && confirm('このカテゴリを削除しますか？')) {
        data.categories[categoryTabType] = data.categories[categoryTabType].filter(c => c.id !== id);
        persist();
        closeModal('categoryModal');
        renderAll();
        showToast('カテゴリを削除しました');
      }
    });
  }

  function setupDataManagement() {
    $('#exportJson').addEventListener('click', () => {
      Storage.exportJson(data);
      showToast('JSONファイルを出力しました');
    });

    $('#exportCsv').addEventListener('click', () => {
      Storage.exportCsv(data);
      showToast('CSVファイルを出力しました');
    });

    $('#importJson').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const imported = await Storage.importJson(file);
        data = Storage.mergeImport(data, imported);
        persist();
        renderAll();
        showToast('JSONファイルを読み込みました');
      } catch (err) {
        showToast(err.message);
      }
      e.target.value = '';
    });

    $('#importCsv').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const imported = await Storage.importCsv(file);
        data = Storage.mergeImport(data, imported);
        persist();
        renderAll();
        showToast('CSVファイルを読み込みました');
      } catch (err) {
        showToast(err.message);
      }
      e.target.value = '';
    });

    $('#clearData').addEventListener('click', () => {
      if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
        data = {
          categories: JSON.parse(JSON.stringify(Storage.DEFAULT_CATEGORIES)),
          transactions: []
        };
        persist();
        renderAll();
        showToast('データを削除しました');
      }
    });
  }

  function setupModals() {
    $$('.modal__backdrop, .modal__close').forEach(el => {
      el.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) closeModal(modal.id);
      });
    });

    $('#closeDayModal').addEventListener('click', () => closeModal('dayModal'));
    $('#addDayTransaction').addEventListener('click', () => {
      closeModal('dayModal');
      openTransactionModal(selectedDate);
    });
  }

  function setupColorIconPickers() {
    const colorPicker = $('#colorPicker');
    colorPicker.innerHTML = COLORS.map(c =>
      `<button type="button" class="color-option${c === '#e74c3c' ? ' selected' : ''}" data-color="${c}" style="background:${c}"></button>`
    ).join('');

    colorPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('.color-option');
      if (!btn) return;
      $$('.color-option').forEach(o => o.classList.remove('selected'));
      btn.classList.add('selected');
      $('#categoryColor').value = btn.dataset.color;
    });

    const iconPicker = $('#iconPicker');
    iconPicker.innerHTML = ICONS.map(icon =>
      `<button type="button" class="icon-option${icon === '🍽️' ? ' selected' : ''}" data-icon="${icon}">${icon}</button>`
    ).join('');

    iconPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('.icon-option');
      if (!btn) return;
      $$('.icon-option').forEach(o => o.classList.remove('selected'));
      btn.classList.add('selected');
      $('#categoryIcon').value = btn.dataset.icon;
    });
  }

  // ===== Render =====

  function renderAll() {
    $('#currentMonthLabel').textContent = Calendar.formatMonthLabel(currentYear, currentMonth);
    renderDashboard();
    renderRecords();
    renderCategories();
    updateFilterCategories();
  }

  function getMonthTransactions() {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return data.transactions.filter(t => t.date.startsWith(prefix));
  }

  function renderDashboard() {
    const monthTx = getMonthTransactions();
    const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    $('#totalIncome').textContent = Charts.formatAmount(income);
    $('#totalExpense').textContent = Charts.formatAmount(expense);
    $('#totalBalance').textContent = Charts.formatAmount(income - expense);

    Calendar.render($('#calendar'), currentYear, currentMonth, monthTx, (date) => {
      openDayModal(date);
    });

    const recent = [...data.transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 5);

    renderTransactionList($('#recentTransactions'), recent);
  }

  function renderRecords() {
    const filterType = $('#filterType').value;
    const filterCat = $('#filterCategory').value;

    let filtered = getMonthTransactions();

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }
    if (filterCat !== 'all') {
      filtered = filtered.filter(t => t.categoryId === filterCat);
    }

    filtered.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    renderTransactionList($('#allTransactions'), filtered);
    $('#recordsEmpty').hidden = filtered.length > 0;
  }

  function renderCategories() {
    const cats = data.categories[categoryTabType];
    const list = $('#categoryList');

    list.innerHTML = cats.map(cat => `
      <li class="category-item" data-id="${cat.id}">
        <span class="category-item__icon" style="background:${cat.color}20">${cat.icon}</span>
        <span class="category-item__name">${cat.name}</span>
        <span class="category-item__arrow">›</span>
      </li>
    `).join('');

    list.querySelectorAll('.category-item').forEach(item => {
      item.addEventListener('click', () => {
        const cat = cats.find(c => c.id === item.dataset.id);
        if (cat) openCategoryModal(cat);
      });
    });
  }

  function renderCharts() {
    const monthTx = getMonthTransactions();
    const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const pieData = Charts.aggregateByCategory(monthTx, data.categories.expense, 'expense');
    Charts.renderPieChart($('#pieChart'), pieData, $('#pieLegend'));

    const dailyData = Charts.aggregateDaily(data.transactions, currentYear, currentMonth);
    Charts.renderBarChart($('#barChart'), dailyData);

    Charts.renderComparison($('#comparisonBars'), income, expense);
  }

  function renderTransactionList(container, transactions) {
    const catMap = getCategoryMap();

    container.innerHTML = transactions.map(t => {
      const cat = catMap[t.categoryId];
      const icon = cat ? cat.icon : '📋';
      const color = cat ? cat.color : '#95a5a6';
      const name = cat ? cat.name : '不明';
      const sign = t.type === 'income' ? '+' : '-';

      return `<li class="transaction-item" data-id="${t.id}">
        <span class="transaction-item__icon" style="background:${color}20">${icon}</span>
        <div class="transaction-item__info">
          <div class="transaction-item__category">${name}</div>
          <div class="transaction-item__meta">${formatDisplayDate(t.date)}${t.memo ? ' · ' + escapeHtml(t.memo) : ''}</div>
        </div>
        <span class="transaction-item__amount transaction-item__amount--${t.type}">${sign}${Charts.formatAmount(t.amount)}</span>
      </li>`;
    }).join('');

    container.querySelectorAll('.transaction-item').forEach(item => {
      item.addEventListener('click', () => {
        const tx = data.transactions.find(t => t.id === item.dataset.id);
        if (tx) openTransactionModal(null, tx);
      });
    });
  }

  function updateFilterCategories() {
    const select = $('#filterCategory');
    const current = select.value;
    const allCats = [...data.categories.expense, ...data.categories.income];

    select.innerHTML = '<option value="all">全カテゴリ</option>' +
      allCats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');

    if (allCats.some(c => c.id === current)) {
      select.value = current;
    }
  }

  // ===== Modals =====

  function openTransactionModal(date, transaction) {
    const form = $('#transactionForm');
    form.reset();

    if (transaction) {
      $('#modalTitle').textContent = '記録を編集';
      $('#transactionId').value = transaction.id;
      transactionType = transaction.type;
      $('#transactionDate').value = transaction.date;
      $('#transactionAmount').value = transaction.amount;
      $('#transactionMemo').value = transaction.memo || '';
      $('#deleteTransaction').hidden = false;

      $$('.type-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.type === transaction.type);
      });
      updateCategorySelect('transactionCategory', transaction.type);
      $('#transactionCategory').value = transaction.categoryId;
    } else {
      $('#modalTitle').textContent = '記録を追加';
      $('#transactionId').value = '';
      transactionType = 'expense';
      $('#transactionDate').value = date || formatToday();
      $('#deleteTransaction').hidden = true;

      $$('.type-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.type === 'expense');
      });
      updateCategorySelect('transactionCategory', 'expense');
    }

    openModal('transactionModal');
  }

  function openCategoryModal(category) {
    if (category) {
      $('#categoryModalTitle').textContent = 'カテゴリを編集';
      $('#categoryId').value = category.id;
      $('#categoryName').value = category.name;
      $('#categoryColor').value = category.color;
      $('#categoryIcon').value = category.icon;
      $('#categoryType').value = categoryTabType;
      $('#deleteCategory').hidden = false;

      $$('.color-option').forEach(o => o.classList.toggle('selected', o.dataset.color === category.color));
      $$('.icon-option').forEach(o => o.classList.toggle('selected', o.dataset.icon === category.icon));
    } else {
      $('#categoryModalTitle').textContent = 'カテゴリを追加';
      $('#categoryId').value = '';
      $('#categoryName').value = '';
      $('#categoryColor').value = COLORS[0];
      $('#categoryIcon').value = ICONS[0];
      $('#categoryType').value = categoryTabType;
      $('#deleteCategory').hidden = true;

      $$('.color-option').forEach((o, i) => o.classList.toggle('selected', i === 0));
      $$('.icon-option').forEach((o, i) => o.classList.toggle('selected', i === 0));
    }

    openModal('categoryModal');
  }

  function openDayModal(date) {
    selectedDate = date;
    const dayTx = data.transactions.filter(t => t.date === date);
    const income = dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    $('#dayModalTitle').textContent = formatDisplayDate(date);
    $('#daySummary').innerHTML = `
      <div class="day-summary__item">
        <div class="day-summary__label">収入</div>
        <div class="day-summary__value" style="color:var(--color-income)">${Charts.formatAmount(income)}</div>
      </div>
      <div class="day-summary__item">
        <div class="day-summary__label">支出</div>
        <div class="day-summary__value" style="color:var(--color-expense)">${Charts.formatAmount(expense)}</div>
      </div>
      <div class="day-summary__item">
        <div class="day-summary__label">収支</div>
        <div class="day-summary__value">${Charts.formatAmount(income - expense)}</div>
      </div>
    `;

    renderTransactionList($('#dayTransactions'), dayTx);
    openModal('dayModal');
  }

  function openModal(id) {
    const modal = $(`#${id}`);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal(id) {
    const modal = $(`#${id}`);
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  // ===== Save =====

  function saveTransaction() {
    const id = $('#transactionId').value;
    const tx = {
      id: id || Storage.generateId('tx'),
      type: transactionType,
      date: $('#transactionDate').value,
      amount: parseInt($('#transactionAmount').value, 10),
      categoryId: $('#transactionCategory').value,
      memo: $('#transactionMemo').value.trim()
    };

    if (id) {
      const idx = data.transactions.findIndex(t => t.id === id);
      if (idx >= 0) data.transactions[idx] = tx;
    } else {
      data.transactions.push(tx);
    }

    persist();
    closeModal('transactionModal');
    renderAll();
    showToast(id ? '記録を更新しました' : '記録を追加しました');
  }

  function saveCategory() {
    const id = $('#categoryId').value;
    const type = $('#categoryType').value;
    const cat = {
      id: id || Storage.generateId('cat'),
      name: $('#categoryName').value.trim(),
      color: $('#categoryColor').value,
      icon: $('#categoryIcon').value
    };

    if (id) {
      const idx = data.categories[type].findIndex(c => c.id === id);
      if (idx >= 0) data.categories[type][idx] = cat;
    } else {
      data.categories[type].push(cat);
    }

    persist();
    closeModal('categoryModal');
    renderAll();
    showToast(id ? 'カテゴリを更新しました' : 'カテゴリを追加しました');
  }

  function persist() {
    Storage.save(data);
  }

  // ===== Helpers =====

  function getCategoryMap() {
    const map = {};
    [...data.categories.expense, ...data.categories.income].forEach(c => {
      map[c.id] = c;
    });
    return map;
  }

  function updateCategorySelect(selectId, type) {
    const select = $(`#${selectId}`);
    const cats = data.categories[type];
    select.innerHTML = cats.map(c =>
      `<option value="${c.id}">${c.icon} ${c.name}</option>`
    ).join('');
  }

  function formatToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatDisplayDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${parseInt(m)}月${parseInt(d)}日`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  let toastTimer;
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
  }

  window.addEventListener('resize', () => {
    if ($('#view-charts').classList.contains('active')) {
      renderCharts();
    }
  });

  document.addEventListener('DOMContentLoaded', init);
})();
