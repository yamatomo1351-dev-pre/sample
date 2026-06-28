/**
 * Calendar module - monthly calendar rendering
 */
const Calendar = (() => {
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

  function render(container, year, month, transactions, onDayClick) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    const dayTotals = computeDayTotals(transactions, year, month);

    let html = '<div class="calendar__weekdays">';
    WEEKDAYS.forEach(day => {
      html += `<span>${day}</span>`;
    });
    html += '</div><div class="calendar__grid">';

    for (let i = 0; i < startDow; i++) {
      html += '<div class="calendar__day calendar__day--empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day);
      const totals = dayTotals[dateStr] || { income: 0, expense: 0 };
      const isToday = isCurrentMonth && today.getDate() === day;
      const hasData = totals.income > 0 || totals.expense > 0;

      let dotsHtml = '';
      if (hasData) {
        dotsHtml = '<div class="calendar__dots">';
        if (totals.expense > 0) dotsHtml += '<span class="calendar__dot calendar__dot--expense"></span>';
        if (totals.income > 0) dotsHtml += '<span class="calendar__dot calendar__dot--income"></span>';
        dotsHtml += '</div>';
      }

      let amountHtml = '';
      if (totals.expense > 0) {
        amountHtml = `<span class="calendar__amount">-${formatShortAmount(totals.expense)}</span>`;
      }

      html += `<button type="button" class="calendar__day${isToday ? ' calendar__day--today' : ''}" data-date="${dateStr}">
        <span class="calendar__day-num">${day}</span>
        ${dotsHtml}
        ${amountHtml}
      </button>`;
    }

    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.calendar__day[data-date]').forEach(btn => {
      btn.addEventListener('click', () => {
        onDayClick(btn.dataset.date);
      });
    });
  }

  function computeDayTotals(transactions, year, month) {
    const totals = {};
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    transactions.forEach(t => {
      if (!t.date.startsWith(prefix)) return;
      if (!totals[t.date]) totals[t.date] = { income: 0, expense: 0 };
      if (t.type === 'income') {
        totals[t.date].income += t.amount;
      } else {
        totals[t.date].expense += t.amount;
      }
    });

    return totals;
  }

  function formatDate(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function formatShortAmount(amount) {
    if (amount >= 10000) {
      return `${Math.round(amount / 1000) / 10}万`;
    }
    if (amount >= 1000) {
      return `${Math.round(amount / 100) / 10}k`;
    }
    return String(amount);
  }

  function formatMonthLabel(year, month) {
    return `${year}年${month + 1}月`;
  }

  return { render, formatDate, formatMonthLabel, formatShortAmount };
})();
