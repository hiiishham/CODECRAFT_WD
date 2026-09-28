import Employee from '../models/Employee.js';

/**
 * Resolves the corresponding Employee document for the authenticated user
 * @param {Object} user - req.user from JWT
 * @returns {Promise<Employee|null>}
 */
export const resolveEmployeeForUser = async (user) => {
  if (!user || !user.email) return null;
  const email = user.email.toLowerCase().trim();

  let employee = await Employee.findOne({ email });

  // If authenticated as employee and no employee document exists yet, auto-provision profile
  if (!employee && user.role === 'employee') {
    employee = await Employee.create({
      employeeId: 'EMP-100',
      fullName: user.name || 'David Staff',
      email,
      phone: '+91 98000 11223',
      department: 'Development',
      designation: 'Software Engineer',
      salary: 65000,
      profileImage: user.avatar || '',
      status: 'Active',
    });
  }

  return employee;
};

export default resolveEmployeeForUser;
