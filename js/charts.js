/**
 * Charts module - canvas-based visualization (no external libraries)
 */
const Charts = (() => {
  const COLORS = [
    '#e74c3c', '#3498db', '#9b59b6', '#f39c12', '#1abc9c',
    '#e67e22', '#2ecc71', '#34495e', '#16a085', '#d35400'
  ];

  function renderPieChart(canvas, data, legendContainer) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(canvas.parentElement.clientWidth - 32, 300);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    if (data.length === 0) {
      drawEmptyState(ctx, size, size, 'データなし');
      legendContainer.innerHTML = '';
      return;
    }

    const total = data.reduce((sum, d) => sum + d.amount, 0);
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 10;
    let startAngle = -Math.PI / 2;

    data.forEach((item, i) => {
      const sliceAngle = (item.amount / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = item.color || COLORS[i % COLORS.length];
      ctx.fill();
      startAngle += sliceAngle;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('支出', cx, cy - 10);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#7f8c8d';
    ctx.fillText(formatAmount(total), cx, cy + 10);

    legendContainer.innerHTML = data.map((item, i) => {
      const pct = ((item.amount / total) * 100).toFixed(1);
      return `<li class="chart-legend__item">
        <span class="chart-legend__color" style="background:${item.color || COLORS[i % COLORS.length]}"></span>
        <span class="chart-legend__label">${item.name}</span>
        <span class="chart-legend__value">${formatAmount(item.amount)} (${pct}%)</span>
      </li>`;
    }).join('');
  }

  function renderBarChart(canvas, dailyData) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = Math.min(canvas.parentElement.clientWidth - 32, 400);
    const height = 200;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    if (dailyData.length === 0) {
      drawEmptyState(ctx, width, height, 'データなし');
      return;
    }

    const padding = { top: 20, right: 10, bottom: 30, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...dailyData.map(d => Math.max(d.income, d.expense)), 1);
    const barGroupWidth = chartW / dailyData.length;
    const barWidth = Math.min(barGroupWidth * 0.35, 12);
    const gap = 2;

    dailyData.forEach((d, i) => {
      const x = padding.left + i * barGroupWidth + barGroupWidth / 2;

      const expH = (d.expense / maxVal) * chartH;
      const incH = (d.income / maxVal) * chartH;

      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(x - barWidth - gap / 2, padding.top + chartH - expH, barWidth, expH);

      ctx.fillStyle = '#27ae60';
      ctx.fillRect(x + gap / 2, padding.top + chartH - incH, barWidth, incH);

      if (dailyData.length <= 15 || i % Math.ceil(dailyData.length / 10) === 0) {
        ctx.fillStyle = '#7f8c8d';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(d.day), x, height - 8);
      }
    });
  }

  function renderComparison(container, income, expense) {
    const max = Math.max(income, expense, 1);

    container.innerHTML = `
      <div class="comparison-bar">
        <div class="comparison-bar__label">
          <span>収入</span>
          <span>${formatAmount(income)}</span>
        </div>
        <div class="comparison-bar__track">
          <div class="comparison-bar__fill comparison-bar__fill--income" style="width:${(income / max) * 100}%"></div>
        </div>
      </div>
      <div class="comparison-bar">
        <div class="comparison-bar__label">
          <span>支出</span>
          <span>${formatAmount(expense)}</span>
        </div>
        <div class="comparison-bar__track">
          <div class="comparison-bar__fill comparison-bar__fill--expense" style="width:${(expense / max) * 100}%"></div>
        </div>
      </div>
    `;
  }

  function drawEmptyState(ctx, w, h, text) {
    ctx.fillStyle = '#bdc3c7';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
  }

  function formatAmount(amount) {
    return '¥' + amount.toLocaleString('ja-JP');
  }

  function aggregateByCategory(transactions, categories, type) {
    const catMap = {};
    categories.forEach(c => { catMap[c.id] = c; });

    const totals = {};
    transactions
      .filter(t => t.type === type)
      .forEach(t => {
        if (!totals[t.categoryId]) {
          const cat = catMap[t.categoryId];
          totals[t.categoryId] = {
            name: cat ? cat.name : '不明',
            color: cat ? cat.color : '#95a5a6',
            amount: 0
          };
        }
        totals[t.categoryId].amount += t.amount;
      });

    return Object.values(totals).sort((a, b) => b.amount - a.amount);
  }

  function aggregateDaily(transactions, year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daily = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTx = transactions.filter(t => t.date === dateStr);
      daily.push({
        day: d,
        income: dayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      });
    }

    return daily;
  }

  return {
    renderPieChart,
    renderBarChart,
    renderComparison,
    aggregateByCategory,
    aggregateDaily,
    formatAmount
  };
})();
