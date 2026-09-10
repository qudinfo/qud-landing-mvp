# Этап 8 — Real Strategy Library, 10.09.2026

Раздел «Стратегии» загружает реальный каталог при первом открытии через
`GET /owner/api/strategies`. Успешный результат хранится только в памяти
открытой страницы. Реализованы состояния loading, loaded, empty, error и
повтор запроса без перезагрузки кабинета.

Строка стратегии показывает только Strategy ID, Trust Score, Trust Zone,
Win Ratio и количество недель истории. Строки некликабельны; demo-карточки,
графики и дополнительные KPI из раздела удалены. Остальные demo-разделы не
изменялись. Потеря Owner-сессии возвращает пользователя в существующий
Stage 7 session-flow без изменения `session.js`.

Backend, Apps Script и Virtual Portfolio в рамках этапа 8 не изменяются.
Strategy Card относится к этапу 9 и здесь не реализована.

---

# Этап 7 — Owner Login, 10.09.2026

Текущий frontend использует только GET / POST / DELETE `/owner/api/session`.
POST передаёт `{access_key: ...}`. Cookie устанавливает существующий Worker;
ключ не сохраняется frontend в localStorage или sessionStorage.
`session.js` управляет загрузкой, формой, открытием исходного shell и выходом.
Показатели исходного shell остаются демонстрационными.

Локально проверено в браузере с неизменённым owner-api.js и тестовым ключом:
- Access → кабинет → неверный ключ → корректный вход → shell → logout → форма;
- полноэкранная загрузка, сохранение cookie после перезагрузки;
- недействительная сессия → форма входа;
- недоступный API → ошибка → повторная проверка.
Проверка синтаксиса app.js и session.js успешна.

Публикация не выполнялась. Production PASS ещё не подтверждён.
Для публикации cabinet/index.html, app.js, styles.css и session.js должны
находиться в /owner/cabinet/. На опубликованной Access-странице заменить
только адрес кнопки «Уже есть доступ» на /owner/cabinet/.
Локальная access/index.html отличается от опубликованной версии: исходная
кнопка не имела ссылки. Не заменять публичную страницу целиком без сверки.
Backend, Apps Script, VP и sources не изменялись.

---
Ниже — историческое описание frontend-каркаса до подключения этапа 7.

# QUD Owner Cabinet MVP

This directory contains the isolated frontend shell for the capital owner's cabinet.

Current route:

- `/owner/cabinet/`

Current stage:

- responsive frontend shell based on the approved dashboard composition;
- matte graphite visual system aligned with `/owner/access/` and
  `/traders/tradermap/`: flat dark surfaces, restrained grey accents and no
  gold glow effects;
- five primary sections: Overview, Strategies, Virtual Portfolio, Real Account and Documents;
- a Strategy Library with compact horizontal demo cards showing Strategy ID,
  Trust Score, Trust Zone, Win Ratio and history length;
- accessible inline expansion for one strategy at a time: the demo Balance
  chart follows the summary row, then only non-repeating additional KPIs;
- separate profile and logout controls;
- demo-only portfolio values marked in the interface and in the HTML with `data-demo`;
- no production user identity, subscription state or working financial data;
- no API calls, authentication or persistence in `app.js`;
- the existing Virtual Portfolio remains available at `/portal/portfolio/mvp/` and is not modified.

The Real Account, documents, help, profile and subscription controls are visual
placeholders. They must not be connected to production behavior until their
individual user flows and contracts are approved.

Planned integration:

1. Owner authentication and user identity.
2. Protected `/owner/api/*` routes through Cloudflare.
3. Strategy Library.
4. Existing Virtual Portfolio data through the protected API.
