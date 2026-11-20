# API endpoints

Base URL: `http://localhost:3000`

Data is stored in the MongoDB database configured by `MONGODB_URI` and `MONGODB_DB` (defaults: `mongodb://127.0.0.1:27017` and `mathinikquest`). MongoDB database names cannot contain spaces.

Collections: `users`, `logins` (session tokens, removed automatically after 7 days), `sessions` (finished games), `progress` (adventure XP, stars, Number Trail best scores).

## Accounts and roles

| Role | Can do |
|---|---|
| admin | Create, edit and delete every account; assign students to teachers; see every class's games |
| teacher | Add students to their own class; reset their students' passwords; see only their own students' games and progress |
| student | Play; save their own games and adventure progress; see only their own results |

On first start, if no admin exists, the server creates one: username `admin`, password `admin123` (or the `ADMIN_PASSWORD` environment variable). Log in and change it from **My account**.

Every endpoint except `health`, `questions` and `auth/login` needs the header `Authorization: Bearer <token>`.

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| GET | `/api/health` | anyone | Check server status |
| GET | `/api/questions?topic=Integers&level=Easy` | anyone | Retrieve question bank |
| POST | `/api/auth/login` | anyone | `{username, password, role}` → `{token, user}`; `role` must match the account |
| POST | `/api/auth/register` | anyone | `{role, name, username, password, confirm, classCode?, section?}`. Students (optional teacher class code) are logged in at once → `{token, user}`; teachers are created **pending** until an admin approves; admins cannot sign up |
| POST | `/api/auth/forgot` | anyone | `{username, role}` → opens a password-help request for the student's teacher (and admins). Same reply whether or not the account exists |
| POST | `/api/auth/logout` | logged in | End this login |
| GET | `/api/auth/me` | logged in | Current user |
| POST | `/api/auth/password` | logged in | `{currentPassword, newPassword}`; logs out the account's other devices |
| PATCH | `/api/me` | logged in | Edit profile: `{name?}` for your own account. Section, username, role and teacher cannot be changed here; a student's section is set by their teacher or an admin |
| PUT / DELETE | `/api/me/avatar` | logged in | Set (`{image: "data:image/jpeg;base64,…"}`, JPG/PNG/WebP, max 300 KB; the app sends 256×256) or remove your profile picture |
| GET | `/api/avatars?ids=a,b` | logged in | Pictures as data URLs, only for accounts you may see: yourself; a teacher also their own students; admins everyone |
| PUT / DELETE | `/api/users/:id/avatar` | teacher, admin | Set or remove someone else's picture: teachers for their own students, admins for anyone |
| POST | `/api/sessions` | student | Save a completed game |
| GET | `/api/sessions` | logged in | Latest 200 games: own (student), own class (teacher), all (admin); `?studentId=` filters |
| GET | `/api/summary` | logged in | Total games, points and average percent for the same scope |
| GET / PUT | `/api/me/progress` | student | Adventure XP, stars and Number Trail bests (PUT only ever raises values) |
| GET | `/api/teacher/students` | teacher | Own students with games, average %, latest pre/post-test %, stars, XP, last played |
| POST | `/api/teacher/students` | teacher | `{name, username, password, section}` → new student in this class |
| PATCH | `/api/teacher/students/:id` | teacher | `{name?, section?, password?}` for own students |
| GET | `/api/teacher/requests` | teacher | Open password-help requests from own students |
| POST | `/api/teacher/requests/:id/dismiss` | teacher | Close a request without changing the password |
| POST | `/api/teacher/class-code` | teacher | Make a new class code (the old one stops working) |
| GET | `/api/admin/summary` | admin | Accounts per role, pending sign-ups, open password requests, games, average % |
| GET | `/api/admin/requests` | admin | Every open password-help request |
| POST | `/api/admin/requests/:id/dismiss` | admin | Close a request without changing the password |
| GET | `/api/admin/users` | admin | Every account (students include their stats and teacher) |
| POST | `/api/admin/users` | admin | `{role, name, username, password, section?, teacherId?}` |
| PATCH | `/api/admin/users/:id` | admin | `{name?, section?, password?, teacherId?, status?: "active"}`; moving a student moves their past games too; `status: "active"` approves a pending teacher |
| DELETE | `/api/admin/users/:id` | admin | Delete an account (not your own, not the last admin). Games are kept; a deleted teacher's students stay, unassigned |

Setting a password (teacher or admin) also closes that person's open password-help requests. If the only admin forgets their password, run this in the `backend` folder on the server computer:

```bash
npm run reset-password -- admin NEWPASSWORD
```

Usernames: 3–30 characters (letters, numbers, `.`, `-`, `_`), stored in lowercase. Passwords: at least 6 characters, stored as salted scrypt hashes. 8 wrong passwords for one username from one address lock it for 15 minutes.

## Example POST body (`/api/sessions`, student token)
```json
{
  "playerName": "Ana Reyes",
  "mode": "Individual",
  "topic": "Integers",
  "difficulty": "Easy",
  "type": "Pre-test",
  "score": 60,
  "totalQuestions": 8
}
```
`type` is one of `Practice`, `Pre-test`, `Post-test`, `Adventure`. `score` cannot be more than `totalQuestions × 10`.
