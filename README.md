# My Family Documents — Web (Angular 22)

Theme follows the reference app in `D:\Working\work\angular`
(Poppins font, primary `#0043E0`, `#CAD8FF` card borders, collapsible icon sidebar).

All data comes from the .NET API in `../backend` (SQL Server + private file storage). There is no
mock or seed data in the web app.

## Run

Start the API first (`../backend`, http://localhost:5000), then:

```bash
npm install
npm start
```

Open http://localhost:5500 (port is set in `angular.json` → `serve.options.port`). The API URL comes
from `src/environments/environment.development.ts` (`http://localhost:5000/api`); production uses `/api`.

First use: open **/signup** and create the family account with the one-time setup code the owner
set in the API's user-secrets (`Signup:SetupCode`). Sign-up closes after that one account.

What the API enforces (the web app repeats the quick checks):
- every list / get / update / delete is limited to the signed-in user's own members and documents
- sign up needs the setup code and closes after one use
- forgot-password always answers the same way; the reset link is only sent by email
- uploads: PDF / JPG / PNG only, max 10 MB, extension + real file header (magic bytes) checked
- deleting a member also deletes their documents and files

## Structure

```
src/app
├── core/       layout (sidebar shell), guards, http (interceptors), services (auth, members, documents, categories, ui), file rules
├── shared/     models, validators, document table + preview
└── features/
    ├── auth/               login, signup (one-time setup code), forgot + reset password
    ├── dashboard/
    ├── family-members/     member cards + add/edit form, member documents
    ├── documents/          all documents (search + filters), add/edit/replace file
    ├── medical-documents/  medical records by member
    └── account/            profile, change password, logout
```

Standalone components, lazy-loaded routes with auth guards, Reactive Forms, signals. Bootstrap 5 + Bootstrap Icons.
