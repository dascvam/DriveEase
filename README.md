# DriveEase

DriveEase is a full-stack car rental management web application built as a college project. It provides a simple browsing and reservation experience for customers and an operations dashboard for administrators.

## Overview

Customers can register, find vehicles, check date availability, reserve a car, choose optional extras, complete a simulated payment, and track rental status. Administrators can manage vehicle inventory, process rentals, view revenue and fleet statistics, and respond to damage reports.

## Key Features

### Customer

- Create and log in to an account
- Search vehicles by model name
- Filter cars by category and maximum daily price
- Check availability for selected pickup and return dates
- View daily rental prices and vehicle details
- Add GPS, a child seat, or an extra driver
- Reserve a vehicle using a credit/debit card, UPI, or pay-at-pickup option
- View rental history and booking progress
- Cancel eligible confirmed reservations
- Submit damage reports for existing rentals

### Administrator

- View fleet, rental, revenue, and damage statistics
- Add, edit, and remove vehicles
- Upload vehicle images
- Mark vehicles as available or in maintenance
- Update rental status through confirmation, pickup, return, closure, or cancellation
- Review and resolve damage reports

## Technology Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript
- **Backend:** Node.js and Express.js
- **Authentication:** Express sessions with bcrypt password hashing
- **File uploads:** Multer
- **Database:** Local JSON file (`data.json`)
- **Vehicle images:** Stored in `public/uploads/`

## Project Structure

```text
driveease/
├── public/
│   ├── index.html       # Application shell
│   ├── app.js           # Frontend routing and application logic
│   ├── style.css        # Responsive user interface styles
│   └── uploads/         # Uploaded vehicle images
├── server.js            # Express server and REST API
├── data.json            # Local application data store
├── package.json         # Project scripts and dependencies
└── package-lock.json    # Dependency lock file
```

## Getting Started

### Prerequisites

- Node.js 18 or a later supported version
- npm

### Installation

1. Clone or download the project.

```bash
cd driveease
```

2. Install dependencies.

```bash
npm install
```

3. Start the application.

```bash
npm start
```

4. Open **http://localhost:3000** in a browser.

The server creates `data.json` with sample vehicles and an administrator account when no data file exists.

## Demo Account

Use the following account to explore the administrator dashboard:

- **Email:** `admin@driveease.com`
- **Password:** `admin123`

Customers can also create a new account from the registration page.

## Application Workflow

1. A customer registers or signs in.
2. The customer searches or filters available vehicles.
3. Pickup and return dates are selected.
4. The rental total is calculated from the number of days, add-ons, and 5% tax.
5. A payment method is selected and validated.
6. DriveEase creates a rental record with a unique reservation code.
7. The administrator updates the rental lifecycle and vehicle fleet status.

## Payment Notes

Payments are simulated for educational use. The application validates card, UPI, or pay-at-pickup selections but does not connect to a real payment gateway. Card details are not persisted in `data.json`.

## Data Storage

DriveEase uses a local JSON database instead of an external database engine. The server reads and writes application data in `data.json`; uploaded vehicle images are saved under `public/uploads/`.

> This storage approach is intended for local demonstration and development. It is not recommended for concurrent production use or sensitive production data.

## API Summary

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/register` | Register a customer |
| `POST` | `/api/login` | Start a session |
| `POST` | `/api/logout` | End a session |
| `GET` | `/api/me` | Get the signed-in user |
| `GET` | `/api/vehicles` | Browse and filter vehicles |
| `POST`, `PUT`, `DELETE` | `/api/vehicles` | Manage vehicle inventory (admin) |
| `POST`, `GET` | `/api/reservations` | Create or view rentals |
| `PUT` | `/api/reservations/:id/status` | Change rental status |
| `POST`, `GET` | `/api/damage` | Submit or view damage reports |
| `PUT` | `/api/damage/:id` | Update damage report status (admin) |
| `GET` | `/api/dashboard` | Get admin dashboard statistics |

## Validation and Upload Rules

- Customer phone numbers must contain 10 digits
- Driving licence numbers must contain at least 8 characters
- Passwords must contain at least 6 characters
- Vehicle plates use formats similar to `PB 08 AB 1234`
- Vehicle images support JPG, PNG, WebP, and GIF formats
- Uploaded vehicle images are limited to 5 MB
- Pickup and return dates must avoid active reservations for the selected vehicle

## Contributors

- **Shiv Kumar Das Kathbaniya — Team Leader**
- **Riddhi Singh Rathore**
- **Anmol Gupta**
