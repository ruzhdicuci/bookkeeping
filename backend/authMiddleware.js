import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

 const token = req.headers.authorization?.split(' ')[1];

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret');
    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
}