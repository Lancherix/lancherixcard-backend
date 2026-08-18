import jwt from "jsonwebtoken";

// Verifies tokens issued by LancherixAuth's /auth/login route
// (jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })).
//
// Requires this app's backend to have the SAME JWT_SECRET value as the Auth
// backend. Set it in .env (never committed) — see .env.example.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "missingToken" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded.id is the Mongo ObjectId string of the user in the Auth DB.
    // This app never touches the Auth DB directly — it just uses this id
    // as the tenancy key on every row in its own database.
    req.userId = decoded.id;
    next();
  } catch (error) {
    // Covers both a bad signature (wrong/rotated secret) and an expired
    // token (7 day expiry set by Auth) — either way, the client should
    // clear its stored token and send the user back to login.
    return res.status(401).json({ message: "invalidToken" });
  }
}
