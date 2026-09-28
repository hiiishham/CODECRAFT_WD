import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT token
 * @param {string} id - Admin ID
 * @param {string} role - User role (default: 'admin')
 * @returns {string} Signed JWT token
 */
export const generateToken = (id, role = 'admin') => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign({ id, role }, secret, {
    expiresIn: '7d',
  });
};

export default generateToken;
