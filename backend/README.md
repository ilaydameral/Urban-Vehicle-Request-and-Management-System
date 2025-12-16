# Backend Overview

This backend provides the APIs for the Urban Vehicle Request and Management System. Recent additions focus on coordinator/admin oversight and stricter trip safety while keeping existing passenger/driver flows intact.

## Key Routes
- `POST /api/drivers/profile` and `GET /api/drivers/me`: manage the authenticated driver's profile.
- `GET /api/drivers` and `GET /api/vehicles`: coordinator/admin list endpoints with filtering and pagination for approvals and fleet status.
- `PATCH /api/drivers/:id/approve` and `PATCH /api/drivers/:id/status`: control driver approval and activity.
- `POST /api/trips/:id/start`: starts a trip with safeguards that prevent concurrent active trips for the same driver/vehicle.

## Frontend Impact
All changes are additive backend safeguards or new admin/coordinator endpoints. Existing passenger and driver API shapes remain unchanged, so current frontend flows continue to work. Frontends can optionally consume the new listing endpoints when building management screens.

## Environment variables for password reset mail
- `PASSWORD_RESET_URL` (optional): Base URL for the reset link (defaults to `FRONTEND_URL` or `http://localhost:5173`).
- `EMAIL_WEBHOOK_URL` (optional): HTTP endpoint to deliver email payloads. If omitted, emails are logged to the console.
- `EMAIL_FROM` (optional): Sender address shown in reset emails.
