Admin dashboard for Kisan Setu

Usage

1. Start your backend server (default expects it at http://localhost:5001).
2. Open `admin/index.html` in a browser (serve it via a static server if needed).
3. Enter the `ADMIN_TOKEN` that the backend uses (or leave blank if backend accepts default dev token).
4. Click "Fetch Orders" to load recent orders. Click "View" on a row to see full order JSON.

Notes

- The dashboard sends header `x-admin-token` with the token you enter. The backend must check this header for admin authorization.
- For quick testing with default dev token, if your backend uses `dev-secret-token` set that as the token or leave empty if the backend is permissive.
- This is a lightweight admin page intended for local development and debugging only. Do not deploy with the token stored in plaintext or without proper authentication in production.

Curl examples

List orders:

curl -H "x-admin-token: <ADMIN_TOKEN>" http://localhost:5001/api/admin/orders

Get one order by id:

curl -H "x-admin-token: <ADMIN_TOKEN>" http://localhost:5001/api/admin/orders/<ORDER_ID>
