# Waitlist Feature Setup

This document explains how to set up the waitlist feature for the coming soon page.

## Overview

The waitlist feature allows users to register their interest in your application by submitting their email addresses. There are two storage options:

1. **JSON File Storage** (Default Fallback): Emails are stored in `waitlist.json` in the project root.
2. **Database Storage** (Recommended): Emails are stored in the SQLite database directly.

## Current Implementation

The current implementation will automatically:
- Try to use the database first
- Fall back to JSON file storage if database operations fail

This means the waitlist functionality works even without additional setup.

## Database Structure

The waitlist database table has been created directly with the following structure:

```sql
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "referrer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Waitlist_email_key" ON "Waitlist"("email");
```

## How It Works

- When a user submits their email through the coming soon page, the form sends a POST request to `/api/waitlist`
- The API route checks if the email is valid and not already registered
- It first tries to store the email in the database (with raw SQL queries)
- If that fails, it falls back to JSON storage
- A success message is shown to the user

## Accessing Waitlist Data

### Via Admin API

You can access the waitlist data via an API endpoint:

```
GET /api/admin/waitlist
```

This endpoint requires an admin token for authentication, set via the `ADMIN_API_TOKEN` environment variable.

Example curl command:
```bash
curl -H "Authorization: Bearer your_admin_token" http://localhost:3000/api/admin/waitlist
```

### Via Database

You can also access the data directly from the SQLite database:

```bash
sqlite3 prisma/dev.db "SELECT * FROM Waitlist"
```

### Via JSON File

If using the fallback JSON storage, the data is stored in `waitlist.json` in the project root.

## Additional Information

- The waitlist component is defined in `src/components/ui/coming-soon.tsx`
- The API route is defined in `src/app/api/waitlist/route.ts`
- Admin API endpoint: `src/app/api/admin/waitlist/route.ts` 