// Set a new password for any account from the server computer.
// Use it when the only admin forgets their password (nobody else can reset it from the app).
//
//   npm run reset-password -- <username> <new password>
//   e.g.  npm run reset-password -- admin MyNewPass123
//
// Uses the same MONGODB_URI / MONGODB_DB settings as the server. Logs the account out everywhere.
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.log("Usage: npm run reset-password -- <username> <new password>");
  process.exit(1);
}
if (password.length < 6) {
  console.log("The new password needs at least 6 characters.");
  process.exit(1);
}

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017");
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "mathinikquest");
    const user = await db.collection("users").findOne({ username: username.toLowerCase() });
    if (!user) { console.log(`No account with the username "${username}".`); process.exitCode = 1; return; }
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
    await db.collection("users").updateOne({ _id: user._id }, { $set: { passwordHash, status: "active" } });
    await db.collection("logins").deleteMany({ userId: user._id });
    await db.collection("resetRequests").updateMany({ userId: user._id, status: "open" }, { $set: { status: "resolved", resolvedAt: new Date().toISOString() } });
    console.log(`Password changed for ${user.name} (@${user.username}, ${user.role}). They can log in with the new password now.`);
  } finally {
    await client.close();
  }
})().catch(error => { console.error("Could not reset the password:", error.message); process.exitCode = 1; });
