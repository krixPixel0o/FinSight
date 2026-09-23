# FinSight

FinSight is a personal finance management and financial intelligence application built with Spring Boot, Spring Security, JWT, JPA/Hibernate, MySQL, and React.

## Implemented Features

- BCrypt registration and JWT login
- Protected current-user and password-change endpoints
- User-owned income and expense transactions
- Pagination, sorting, date/type/category/amount filters, and text search
- User-owned categories
- Budgets with spent, remaining, and percentage-used calculations
- Database-backed dashboard totals and category spending
- Deterministic rule-based financial insights
- CSV transaction export
- Responsive React dashboard with authentication persistence and live transaction entry
- Thymeleaf remains available in the backend

## Structure

- `backend/`: Spring Boot API on port `8081`
- `frontend/`: React/Vite client, normally on port `5173`
- `backend/src/main/java/com/finsight/controller`: REST controllers
- `backend/src/main/java/com/finsight/service`: business logic
- `backend/src/main/java/com/finsight/entity`: JPA entities and enums
- `backend/src/main/java/com/finsight/repository`: Spring Data repositories

## Database Setup

Create a MySQL 8 database named `finsight`, then configure the credentials in `backend/src/main/resources/application.properties`. Hibernate uses `ddl-auto=update`, which adds the new FinSight tables without dropping existing tables or data.

The application currently expects the existing local MySQL configuration. For shared or production environments, move the datasource password and JWT secret to environment variables before deployment.

## Run

Backend:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## API Summary

Public endpoints:

- `POST /API/auth/register`
- `POST /API/auth/login` with `{ "email": "...", "pwd": "..." }`
- `GET /API/healthio`

Authenticated endpoints require `Authorization: Bearer <token>`:

- `GET /API/auth/me`
- `PUT /API/auth/password`
- `GET|POST|PUT|DELETE /API/transactions`
- `GET|POST|DELETE /API/categories`
- `GET|POST|PUT|DELETE /API/budgets`
- `GET /API/dashboard`
- `GET /API/reports/transactions.csv`

All finance records are scoped to the authenticated user. Password hashes and JWT secrets are never returned by API DTOs.

## Verification

```powershell
cd backend
.\mvnw.cmd test

cd ..\frontend
npm run build
```

The current backend test suite includes an application context check. Feature-level ownership, validation, and controller tests are the next recommended testing expansion.