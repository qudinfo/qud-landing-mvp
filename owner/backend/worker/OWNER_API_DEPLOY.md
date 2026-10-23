# QUD Owner API — ручное развёртывание MVP

Эта инструкция подключает защищённый Owner API. Маршруты стратегий остаются
только для чтения. Раздел Virtual Portfolio использует отдельные маршруты
этого же Worker для чтения и создания наблюдений. QUD Core, существующий VP
Worker, `qud_vp_session` и страница `/owner/access/` не изменяются.

Рабочая цепочка:

```text
браузер
→ отдельный Cloudflare Worker /owner/api/*
→ отдельная qud_owner_session
→ Apps Script Owner API Adapter
→ owner_strategy_registry
→ owner_strategy_snapshot
→ owner_strategy_history
```

Для встроенного VP действует вторая ветвь после той же Owner-сессии:

```text
кабинет /owner/cabinet/#portfolio
→ Cloudflare Worker /owner/api/vp/*
→ серверное соответствие owner_id → subscriber_id + portfolio_id
→ действующий Apps Script API Virtual Portfolio
→ таблица Virtual Portfolio
```

Браузер не получает адрес Apps Script, общий секрет или право выбирать чужой
`subscriber_id` / `portfolio_id`. Прежний отдельный VP сохраняется для
совместимости; его вход и cookie не используются в кабинете.

## Дополнительная настройка встроенного VP

После проверки существующих Owner API маршрутов добавьте в тот же Worker:

- `QUD_VP_APPS_SCRIPT_URL` — адрес действующего VP Apps Script `/exec`;
- `QUD_VP_PROXY_SECRET` — секрет действующего VP API;
- `QUD_OWNER_VP_IDENTITY_MAP` — JSON-объект соответствий, хранимый как секрет.

Форма значения последней переменной (идентификаторы здесь только пример):

```json
{"OWNER-001":{"subscriber_id":"SUBSCRIBER-001","portfolio_id":"PORTFOLIO-001"}}
```

В реальной настройке используйте только подтверждённые идентификаторы из
рабочего VP. Не публикуйте значения секретов в репозитории. Для каждого
владельца указывается его собственный портфель; отсутствие соответствия
останавливает запрос, а не подставляет тестовый портфель. Перед первой
записью проверьте владельца и портфель на стороне VP.

Проверка после развёртывания: вход в Owner Cabinet → раздел Virtual Portfolio
→ список доступных стратегий → создание тестового наблюдения → обновление
страницы и повторное открытие того же наблюдения. Затем повторите с другим
владельцем и убедитесь, что первый портфель ему не виден. Существующие
команды импорта CSV и административного допуска эта интеграция не изменяет.

## Перед началом

Подготовьте три разных секретных значения длиной не менее 32 случайных
символов:

- Owner access key — тестовый ключ входа первого владельца;
- Owner proxy secret — общий секрет Worker и Apps Script;
- Owner session secret — ключ подписи cookie.

Не вставляйте эти значения в код, GitHub, сообщения или скриншоты.

Текущий MVP сопоставляет один access key с `TEST-OWNER-001`. `owner_id` уже
хранится внутри подписанной Owner-сессии, но не возвращается API. При
переходе к пяти владельцам потребуется заменить только функцию проверки ключа
на хранилище учётных данных; публичные маршруты и формат сессии сохранятся.

## Часть 1. Google Apps Script

### 1. Проверить проект

Откройте тот же Apps Script-проект, где уже находятся:

- `QudOwnerControl`;
- `QudOwnerDataPublisher`.

Сделайте резервную копию проекта. Через поиск по всем файлам убедитесь, что в
проекте ещё нет функции `doGet`. Локальный Owner-код такой функции не содержит.
Если `doGet` уже существует в реальном проекте, ничего не вставляйте и сначала
зафиксируйте существующий код: два `doGet` в одном Apps Script-проекте создавать
нельзя.

### 2. Добавить Adapter

1. Нажмите `+` → `Скрипт`.
2. Назовите файл `QudOwnerApiAdapter`.
3. Полностью вставьте содержимое файла
   `owner/backend/apps-script/QudOwnerApiAdapter.gs`.
4. Сохраните проект.

Существующие файлы заменять или редактировать не нужно.

### 3. Привязать основную QUD-таблицу

1. В верхнем списке функций выберите `setupQudOwnerApiAdapter`.
2. Нажмите `Выполнить`.
3. Подтвердите разрешение на чтение таблицы, если Google его запросит.
4. Проверьте результат выполнения:

```text
ok: true
spreadsheet_configured: true
```

Функция проверяет три Owner-листа и сохраняет только ID основной таблицы в
Script Properties. Данные листов она не изменяет.

### 4. Добавить proxy secret

1. Откройте `Настройки проекта`.
2. В разделе `Свойства скрипта` добавьте свойство:

```text
QUD_OWNER_PROXY_SECRET = <Owner proxy secret>
```

3. Убедитесь, что после шага 3 там уже существует автоматически созданное
   свойство `QUD_OWNER_SPREADSHEET_ID`.

### 5. Выполнить read-only проверку

1. Выберите функцию `testQudOwnerApiAdapterReadOnly`.
2. Нажмите `Выполнить`.
3. Для текущего опубликованного среза ожидается:

```text
ok: true
published_strategies: 1
strategy_ids: [QST-CAUZ-MPE9]
sample_history_rows: 5
```

Проверка ничего не записывает в Google Sheets.

### 6. Развернуть Web App

1. Нажмите `Начать развёртывание` → `Новое развёртывание`.
2. Тип: `Веб-приложение`.
3. Описание: `QUD Owner API Adapter v1.0.0`.
4. Выполнять от имени: `Я` / владелец проекта.
5. У кого есть доступ: `Все` (`Anyone`).
6. Нажмите `Развернуть`.
7. Скопируйте URL, который заканчивается на `/exec`.

Не используйте URL тестового развёртывания `/dev`.

Откройте `/exec` без параметров в приватной вкладке. Правильный защищённый
ответ:

```json
{"ok":false,"error":"UNAUTHORIZED_PROXY","status":401}
```

Если открывается страница входа Google, Web App недоступен для Worker: проверьте
настройку `У кого есть доступ: Все`.

## Часть 2. Cloudflare

### 7. Создать отдельный Worker

1. Откройте Cloudflare Dashboard → `Workers & Pages`.
2. Создайте новый Worker с именем `qud-owner-api`.
3. Откройте редактор Worker.
4. Полностью замените демонстрационный код содержимым файла
   `owner/backend/worker/owner-api.js`.
5. Нажмите `Deploy`.

Существующий Worker Virtual Portfolio не открывайте и не изменяйте.

### 8. Добавить переменные и секреты Worker

В `Settings` → `Variables and Secrets` добавьте:

| Имя | Тип | Значение |
|---|---|---|
| `QUD_OWNER_ACCESS_KEY` | Secret | тестовый Owner access key |
| `QUD_OWNER_APPS_SCRIPT_URL` | Secret | Apps Script URL `/exec` |
| `QUD_OWNER_PROXY_SECRET` | Secret | тот же proxy secret, что в Apps Script |
| `QUD_OWNER_SESSION_SECRET` | Secret | отдельный session secret |
| `QUD_OWNER_ID` | Variable | `TEST-OWNER-001` |

`QUD_OWNER_ACCESS_KEY`, `QUD_OWNER_PROXY_SECRET` и
`QUD_OWNER_SESSION_SECRET` должны быть тремя разными значениями.

После сохранения переменных снова нажмите `Deploy`, если Cloudflare показывает
неразвёрнутые изменения.

### 9. Назначить маршрут

В разделе Worker `Settings` → `Domains & Routes` добавьте route:

```text
fx-qud.com/owner/api/*
```

Маршрут должен быть связан только с новым Worker `qud-owner-api`.

Не изменяйте существующие маршруты `/portal/vp/*`. Не назначайте новому Worker
маршрут `fx-qud.com/*`: это перехватит публичный сайт.

## Часть 3. Проверка после развёртывания

Откройте `https://fx-qud.com/owner/access/`, затем инструменты разработчика
браузера → `Console`.

### 10. Проверить отсутствие сессии

```javascript
await fetch('/owner/api/session').then((response) => response.json())
```

Ожидается:

```json
{"ok":true,"authenticated":false}
```

### 11. Создать Owner-сессию

```javascript
const ownerAccessKey = window.prompt('Owner access key');
await fetch('/owner/api/session', {
  method: 'POST',
  headers: {'content-type': 'application/json'},
  body: JSON.stringify({access_key: ownerAccessKey})
}).then((response) => response.json())
```

Ожидается `ok: true` и `authenticated: true`. Ответ не должен содержать
`owner_id` или значение access key.

### 12. Получить список стратегий

```javascript
await fetch('/owner/api/strategies').then((response) => response.json())
```

Для `QST-CAUZ-MPE9` объект списка должен содержать только:

```text
strategy_id
trust_score
trust_zone
win_ratio_pct
history_weeks_count
data_period_end
data_status
```

### 13. Получить Strategy Card

```javascript
await fetch('/owner/api/strategies/QST-CAUZ-MPE9')
  .then((response) => response.json())
```

Проверьте:

- `history` содержит 5 строк;
- `max_drawdown_since_start_pct` равен `null`;
- `sl_safe_pct` равен `null`;
- в ответе отсутствуют `audit_id`, `trader_id`, `account_login`, `email`,
  `published_at`, Apps Script URL и proxy secret.

### 14. Завершить сессию

```javascript
await fetch('/owner/api/session', {method: 'DELETE'})
  .then((response) => response.json())
```

После этого повторный запрос `/owner/api/strategies` должен вернуть HTTP 401 и
`UNAUTHENTICATED`.

## Откат

Если проверка не проходит, отключите только route
`fx-qud.com/owner/api/*` у нового Worker. Это сразу убирает Owner API и не влияет
на VP, публичную страницу или данные Google Sheets.
