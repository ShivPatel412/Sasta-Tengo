# Single-domain Hostinger deployment

The application serves all three parts from Laravel:

- `https://shivpatel.in` — React
- `https://shivpatel.in/dashboard` — Laravel dashboard
- `https://shivpatel.in/api` — Laravel API

## Build locally

```bash
npm --prefix frontend install
npm run build
cd backend
composer install --no-dev --optimize-autoloader
php artisan optimize
```

`npm run build` copies the React production files into `backend/public` while preserving Laravel's `index.php` and `.htaccess`.

## Hostinger

Upload the deployment ZIP into `public_html` and extract it there. The ZIP contains:

```text
public_html/
├── .htaccess
└── backend/
    ├── app/
    ├── public/
    ├── vendor/
    └── ...
```

The root `.htaccess` forwards requests to Laravel's `backend/public` directory because Hostinger shared hosting does not allow changing the document root. Laravel's own `.htaccess` remains inside `backend/public`.

Create `backend/.env` with at least:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://shivpatel.in

ADMIN_EMAIL=YOUR_ADMIN_EMAIL
ADMIN_PASSWORD=YOUR_LONG_UNIQUE_PASSWORD

DB_CONNECTION=mysql
DB_HOST=YOUR_DATABASE_HOST
DB_PORT=3306
DB_DATABASE=YOUR_DATABASE_NAME
DB_USERNAME=YOUR_DATABASE_USER
DB_PASSWORD=YOUR_DATABASE_PASSWORD

SESSION_SECURE_COOKIE=true
SESSION_DOMAIN=shivpatel.in

MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=info@shivpatel.in
MAIL_PASSWORD=YOUR_INFO_MAILBOX_PASSWORD
MAIL_FROM_ADDRESS=info@shivpatel.in
MAIL_FROM_NAME="Shiv Patel"
LEAD_NOTIFICATION_EMAIL=info@shivpatel.in
```

Using Hostinger SSH, run:

```bash
cd ~/domains/shivpatel.in/public_html/backend
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan optimize
```

Enable SSL for `shivpatel.in`. Node.js and Vite are not required on the server because React is built locally.
