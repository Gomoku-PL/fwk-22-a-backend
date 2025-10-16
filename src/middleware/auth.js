// src/middleware/auth.js
export function authenticate(req, res, next) {
  req.user = { id: "grup 5  test" };
  next();
}
