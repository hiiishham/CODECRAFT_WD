# StaffPulse - HR & Employee Management System

StaffPulse is a comprehensive, production-ready MERN-stack Employee Management SaaS application. It provides an intuitive interface for Admins, Managers, and Employees to manage attendance, leaves, tasks, salary, performance reviews, and company-wide announcements.

## Features

**Admin Dashboard:**
- Complete overview of organization metrics.
- Manage Employees, Departments, and Managers.
- Full access to Attendance, Leave Management, and Work Submissions.
- Advanced capabilities: Salary processing, Performance Goals tracking, System Settings.
- Full Audit Logging and real-time Socket.IO notifications.

**Manager Dashboard:**
- Access scoped specifically to their assigned Department/Team.
- Approve/Reject leaves for team members.
- Assign and track tasks for their team.
- Review and request changes on work submissions.
- Conduct performance reviews.

**Employee Portal:**
- Check-in/Check-out for attendance tracking.
- View assigned tasks, update progress, and submit work securely.
- Apply for leaves and track leave balance.
- Access digital documents (e.g., offer letters, salary slips) safely.
- View real-time notifications and company announcements.

## Tech Stack

**Frontend:**
- React (Vite)
- React Router DOM
- TailwindCSS (Styling)
- Context API (State Management)
- Recharts (Data Visualization)
- Socket.IO-Client (Real-time events)

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose (ODM)
- JWT (JSON Web Tokens for Stateless Auth)
- bcryptjs (Password Hashing)
- Cloudinary (Cloud Storage for Documents & Avatars)
- Socket.IO (WebSockets)
- Express Rate Limit & Helmet (Security Hardening)

## Installation & Setup

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/yourusername/StaffPulse.git
   cd StaffPulse
   \`\`\`

2. **Install Backend Dependencies:**
   \`\`\`bash
   cd server
   npm install
   \`\`\`

3. **Install Frontend Dependencies:**
   \`\`\`bash
   cd ../client
   npm install
   \`\`\`

4. **Environment Configuration:**
   Create a \`.env\` file in the \`server\` directory based on the \`.env.example\` provided.
   
   *Required variables:*
   - \`PORT\` (e.g., 5000)
   - \`NODE_ENV\` (development/production)
   - \`MONGO_URI\`
   - \`JWT_SECRET\`
   - \`CLOUDINARY_CLOUD_NAME\`, \`CLOUDINARY_API_KEY\`, \`CLOUDINARY_API_SECRET\`

5. **Run the Application:**
   *Start Backend (from \`server\` directory):*
   \`\`\`bash
   npm run dev
   \`\`\`
   
   *Start Frontend (from \`client\` directory):*
   \`\`\`bash
   npm run dev
   \`\`\`

## Security Details

- Passwords are encrypted with `bcryptjs`.
- JWT Tokens are used for strict stateless authentication.
- Strong IDOR (Insecure Direct Object Reference) Protection: API routes enforce that employees cannot modify or access records belonging to others.
- API is protected against brute force attacks using `express-rate-limit`.
- Security headers are enforced using `helmet`.

## Testing

Backend test suites are included to verify functionality and access control.
Run the test suites (ensure you are running a test instance of MongoDB):
\`\`\`bash
npm run test
\`\`\`

## License
ISC
