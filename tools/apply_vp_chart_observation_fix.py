from pathlib import Path

APP = Path('portal/portfolio/mvp/app.js')
INDEX = Path('portal/portfolio/mvp/index.html')
CSS = Path('portal/portfolio/mvp/styles.css')

app = APP.read_text()
index = INDEX.read_text()
css = CSS.read_text()


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'marker not found: {label}')
    return text.replace(old, new, 1)

old_portfolio_points = """    const points = [];
    if (history.length) {
      const firstOpening = finiteNumber(history[0].opening_balance_usd);
      if (firstOpening !== null) {
        points.push({
          date: history[0].period_start_utc || history[0].period_end_utc,
          value: firstOpening
        });
      }
      history.forEach((row) => {
        const closing = finiteNumber(row.closing_balance_usd);
        if (closing !== null) points.push({ date: row.period_end_utc, value: closing });
      });
    }
    renderLineChart(dom.portfolioChart, points, 'Тренд общего баланса портфеля');
"""
new_portfolio_points = """    const balancePoints = [];
    const allocatedPoints = [];
    history.forEach((row) => {
      const closing = finiteNumber(row.closing_balance_usd);
      const allocatedForPeriod = finiteNumber(row.total_allocated_usd);
      if (closing !== null) {
        balancePoints.push({ date: row.period_end_utc, value: closing });
      }
      if (allocatedForPeriod !== null) {
        allocatedPoints.push({ date: row.period_end_utc, value: allocatedForPeriod });
      }
    });
    renderLineChart(
      dom.portfolioChart,
      balancePoints,
      'Тренд общего баланса портфеля',
      {
        referencePoints: allocatedPoints,
        referenceLabel: 'Распределено'
      }
    );
"""
app = replace_once(app, old_portfolio_points, new_portfolio_points, 'portfolio chart points')

old_chart_start = """  function renderLineChart(container, points, ariaLabel) {
    container.replaceChildren();
    if (points.length < 2) {
      container.append(dom.emptyChartTemplate.content.cloneNode(true));
      return;
    }

    const width = 920;
    const height = container.classList.contains('small') ? 230 : 275;
    const padding = { top: 24, right: 22, bottom: 36, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const values = points.map((point) => point.value);
"""
new_chart_start = """  function renderLineChart(container, points, ariaLabel, options = {}) {
    container.replaceChildren();
    if (points.length < 2) {
      container.append(dom.emptyChartTemplate.content.cloneNode(true));
      return;
    }

    const referencePoints = Array.isArray(options.referencePoints)
      ? options.referencePoints.filter((point) => finiteNumber(point?.value) !== null)
      : [];
    const referenceLabel = String(options.referenceLabel || 'Распределено');
    const width = 920;
    const height = container.classList.contains('small') ? 230 : 275;
    const padding = { top: 24, right: 22, bottom: 36, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const values = [
      ...points.map((point) => point.value),
      ...referencePoints.map((point) => point.value)
    ];
"""
app = replace_once(app, old_chart_start, new_chart_start, 'chart function start')

old_coordinates = """    const coordinates = points.map((point, index) => ({
      ...point,
      x: x(index),
      y: y(point.value)
    }));
    const linePath = coordinates.map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }).join(' ');
    const baseY = padding.top + chartHeight;
"""
new_coordinates = """    const coordinates = points.map((point, index) => ({
      ...point,
      x: x(index),
      y: y(point.value)
    }));
    const linePath = coordinates.map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }).join(' ');
    const pointIndexByDate = new Map(
      points.map((point, index) => [String(point.date || ''), index])
    );
    const referenceCoordinates = referencePoints.map((point, index) => {
      const matchedIndex = pointIndexByDate.has(String(point.date || ''))
        ? pointIndexByDate.get(String(point.date || ''))
        : Math.min(index, points.length - 1);
      return {
        ...point,
        x: x(matchedIndex),
        y: y(point.value)
      };
    });
    const referenceLinePath = referenceCoordinates.length >= 2
      ? referenceCoordinates.map((point, index) => {
          return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
        }).join(' ')
      : '';
    const baseY = padding.top + chartHeight;
"""
app = replace_once(app, old_coordinates, new_coordinates, 'chart coordinates')

old_area_line = """    const area = document.createElementNS(svgNs, 'path');
    area.setAttribute('class', 'chart-area');
    area.setAttribute('d', areaPath);
    svg.append(area);

    const line = document.createElementNS(svgNs, 'path');
    line.setAttribute('class', 'chart-line');
    line.setAttribute('d', linePath);
    svg.append(line);

    coordinates.forEach((point) => {
"""
new_area_line = """    const area = document.createElementNS(svgNs, 'path');
    area.setAttribute('class', 'chart-area');
    area.setAttribute('d', areaPath);
    svg.append(area);

    if (referenceLinePath) {
      const referenceLine = document.createElementNS(svgNs, 'path');
      referenceLine.setAttribute('class', 'chart-reference-line');
      referenceLine.setAttribute('d', referenceLinePath);
      svg.append(referenceLine);

      referenceCoordinates.forEach((point) => {
        const circle = document.createElementNS(svgNs, 'circle');
        circle.setAttribute('class', 'chart-reference-point');
        circle.setAttribute('cx', String(point.x));
        circle.setAttribute('cy', String(point.y));
        circle.setAttribute('r', '3');
        const title = document.createElementNS(svgNs, 'title');
        title.textContent = `${referenceLabel}: ${formatMoney(point.value)} · ${formatDate(point.date)}`;
        circle.append(title);
        svg.append(circle);
      });
    }

    const line = document.createElementNS(svgNs, 'path');
    line.setAttribute('class', 'chart-line');
    line.setAttribute('d', linePath);
    svg.append(line);

    coordinates.forEach((point) => {
"""
app = replace_once(app, old_area_line, new_area_line, 'reference series rendering')

old_point_title = """      title.textContent = `${formatDate(point.date)} · ${formatMoney(point.value)}`;
"""
new_point_title = """      title.textContent = `Баланс: ${formatMoney(point.value)} · ${formatDate(point.date)}`;
"""
app = replace_once(app, old_point_title, new_point_title, 'main point title')

index = replace_once(
    index,
    '<p>Каждая точка соответствует завершённой расчётной неделе.</p>',
    '<p>Зелёная линия — баланс. Пунктир — распределённый капитал. Пополнение не считается прибылью.</p>',
    'portfolio chart explanation'
)
index = index.replace('styles.css?v=20260806-1205', 'styles.css?v=20260807-1354')
index = index.replace('app.js?v=20260806-1205', 'app.js?v=20260807-1354')

old_css = ".chart-line { fill: none; stroke: var(--chart); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }\n.chart-area { fill: url(#qud-chart-fill); }\n.chart-point { fill: #0e1113; stroke: var(--chart); stroke-width: 2; }"
new_css = ".chart-line { fill: none; stroke: var(--chart); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }\n.chart-reference-line { fill: none; stroke: #6e767b; stroke-width: 1.6; stroke-dasharray: 7 6; stroke-linecap: round; stroke-linejoin: round; }\n.chart-area { fill: url(#qud-chart-fill); }\n.chart-point { fill: #0e1113; stroke: var(--chart); stroke-width: 2; }\n.chart-reference-point { fill: #0e1113; stroke: #6e767b; stroke-width: 1.6; }"
css = replace_once(css, old_css, new_css, 'chart reference CSS')

APP.write_text(app)
INDEX.write_text(index)
CSS.write_text(css)
