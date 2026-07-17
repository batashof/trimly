# Архитектура

## Frontend

- **Next.js 14 (App Router)**, TypeScript
- - **TailwindCSS + shadcn/ui** — быстро, современно, хорошо смотрится в портфолио
  - - **TanStack Query** — работа с API, кэш, инвалидация
    - - **React Hook Form + Zod** — формы и валидация (схемы шарятся с бэком через `packages/shared`)
      - - **date-fns**, **react-day-picker** — работа с датами, выбор дня
       
        - Одно Next.js-приложение обслуживает обе поверхности: публичную страницу записи (корневые роуты) и админ-панель (`/admin/*`, защищено проверкой JWT). Так проще деплой — один Vercel-проект вместо двух.
       
        - ## Backend
       
        - - **NestJS**, TypeScript
          - - **Prisma ORM**
            - - **Passport-JWT** — авторизация (email + пароль, bcrypt для хэша)
              - - **class-validator / class-transformer** — валидация DTO
                - - Guards с декоратором `@Roles(ADMIN)` — структура рассчитана на добавление ролей позже без переделки
                  - - **grammY** — Telegram-бот (см. `notifications-telegram.md`), работает как модуль внутри того же Nest-процесса
                   
                    - ## База данных
                   
                    - **PostgreSQL на Neon** — serverless Postgres, щедрый free tier, не требует своего сервера БД.
                   
                    - ## Инфраструктура и деплой
                   
                    - ### Frontend → Vercel
                   
                    - Стандартный выбор для Next.js, поддерживает всё из коробки: SSR, Middleware (используется для защиты `/admin` роутов), preview-деплои на каждый PR, Image Optimization.
                   
                    - **Рассматривали GitHub Pages** как альтернативу (тоже бесплатно). Отклонили: GH Pages — чисто статический хостинг, потребовал бы `output: 'export'`, что ломает Middleware (пришлось бы переносить проверку авторизации админки на клиент — менее надёжно), отключает Image Optimization, нет preview-деплоев на PR, сайт по умолчанию живёт на `username.github.io/repo`, а не на корневом домене. При равной цене (0 €) Vercel даёт больше возможностей — выбор в его пользу.
                   
                    - ### Backend → Render (free web service)
                   
                    - Обычный long-running Node-процесс, не serverless. Автодеплой из `apps/api`.
                   
                    - - Минус free-тира: засыпает после 15 мин простоя → холодный старт 30-50 сек на первый запрос.
                      - - Решение для демо: бесплатный внешний пингер (например cron-job.org) раз в 10 минут на health-check эндпоинт (`GET /health`), чтобы сервис не засыпал перед показом рекрутеру/барберу.
                       
                        - **Почему не «всё на Vercel» (serverless-функции для Nest):**
                        - - `@nestjs/schedule` (cron) не работает надёжно между холодными вызовами — а нам он нужен для Telegram-webhook-процесса и потенциальных будущих напоминаний.
                          - - Лимит выполнения 10 сек на Hobby-плане.
                            - - Prisma + Postgres в serverless требует доп. драйвера пула соединения (Neon serverless driver / Prisma Accelerate) — лишняя сложность.
                              - - Для портфолио выгоднее показать «настоящий» Nest-сервер, чем городить serverless-обвязку вокруг него.
                               
                                - ## Структура монорепо (Turborepo)
                               
                                - ```
                                  trimly/
                                  ├── apps/
                                  │   ├── web/          # Next.js — публичная страница + админ-панель
                                  │   └── api/           # NestJS backend (включая Telegram-бота)
                                  ├── packages/
                                  │   └── shared/         # общие Zod-схемы и TS-типы (фронт + бэк)
                                  ├── turbo.json
                                  └── package.json
                                  ```

                                  `packages/shared` — общие Zod-схемы для DTO (например, схема создания записи), которые использует и фронт (валидация формы), и бэк (валидация запроса). Экономит дублирование и хорошо смотрится как приём в портфолио.

                                  ## CI

                                  GitHub Actions: lint + typecheck + test на каждый PR. Деплой фронта и бэка триггерится отдельно самими платформами (Vercel/Render) на push в `main`.
                                  
