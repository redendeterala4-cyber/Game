# MATHINIK QUEST — Grade 7 ARAL Game

A separated full-stack project you can open in **Visual Studio Code**.

## Project sectors
- `frontend/` — HTML, CSS, JavaScript, PWA files (the screens students use).
- `backend/` — Node.js + Express REST API (game/session logic and endpoints).
- MongoDB — stores accounts, completed games and progress in the `mathinikquest` database.
- `docs/` — setup and API notes.

## Requirements
- Visual Studio Code
- Node.js 20 or newer
- npm (installed with Node.js)

## Run the project
1. Extract the ZIP.
2. Open the `IntegerQuest_VSCode` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
5. Make sure your local MongoDB server is running. The backend connects to ` mongodb://127.0.0.1:27017` by default.
   To use a different local URI or database name, set `MONGODB_URI` and `MONGODB_DB` in the terminal before starting the backend.
6. Open `http://localhost:3000` in Chrome or Edge.
7. First login: the first time the server starts it creates the admin account and prints it in the terminal (username `admin`, password `admin123`, or set `ADMIN_PASSWORD` before the first start). Log in on the Admin tab, change the password from ⚙️ My account, then create teacher accounts. Teachers add their own students.
8. Sign-up and forgotten passwords (on the login screen):
   - **Create an account** — students type their teacher's class code (shown on the Teacher dashboard) and can play straight away. Teachers who sign up wait until an admin approves them on the Admin dashboard.
   - **Forgot password?** — the request appears on the student's teacher's dashboard (teachers' and admins' requests go to the admins), where it is one tap to set a new password.
   - If the only admin forgets their password: `npm run reset-password -- admin NEWPASSWORD` in the `backend` folder.

The backend uses the `mathinikquest` database (database names cannot contain spaces) and creates its collections automatically. Existing SQLite data in `database/Mathinik Quest.db` is not migrated automatically.

## Android use
For local testing on a phone, connect the phone and computer to the same Wi-Fi and open:
`http://YOUR-COMPUTER-LAN-IP:3000`

For Android installation as an app, deploy the PWA over HTTPS (or use localhost for development), then in Chrome choose **Install app** / **Add to Home screen**.

## Offline behavior
- The PWA caches the app shell and question bank after the first successful load.
- Gameplay continues offline using the built-in question bank.
- Scores completed offline are queued in the browser's local storage.
- When the app reconnects to the backend, queued scores are submitted automatically.
- The server and SQLite database require the computer/server to be running. The PWA's offline practice works on the phone without the server after the first load.

## Current scope and limitations
- Individual mode works.
- Team mode is pass-and-play on one device (two players take turns).
- This is not live multiplayer across different phones.
- Teacher dashboard shows recorded sessions from the connected backend. Offline scores remain queued on that device until sync.
- Use nicknames or school-approved identifiers; do not enter unnecessary sensitive student information.
- Review questions against the school's Grade 7 ARAL competencies before formal use.
