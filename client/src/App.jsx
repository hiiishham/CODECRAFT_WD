import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { ProtectedRoute, PublicRoute, RootRoute } from './components/common/ProtectedRoute.jsx';
import DashboardLayout from './components/common/DashboardLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ManagerDashboardPage from './pages/ManagerDashboardPage.jsx';
import ManagerTeamPage from './pages/ManagerTeamPage.jsx';
import ManagerTeamMemberPage from './pages/ManagerTeamMemberPage.jsx';
import ManagerTasksPage from './pages/ManagerTasksPage.jsx';
import ManagerLeavePage from './pages/ManagerLeavePage.jsx';
import ManagerSubmissionsPage from './pages/ManagerSubmissionsPage.jsx';
import ManagerAttendancePage from './pages/ManagerAttendancePage.jsx';
import ManagerPerformancePage from './pages/ManagerPerformancePage.jsx';
import EmployeeDashboardPage from './pages/EmployeeDashboardPage.jsx';
import MyAttendancePage from './pages/MyAttendancePage.jsx';
import EmployeeListPage from './pages/EmployeeListPage.jsx';
import AddEmployeePage from './pages/AddEmployeePage.jsx';
import EmployeeDetailsPage from './pages/EmployeeDetailsPage.jsx';
import EditEmployeePage from './pages/EditEmployeePage.jsx';
import DepartmentListPage from './pages/DepartmentListPage.jsx';
import AddDepartmentPage from './pages/AddDepartmentPage.jsx';
import EditDepartmentPage from './pages/EditDepartmentPage.jsx';
import DepartmentDetailsPage from './pages/DepartmentDetailsPage.jsx';
import LeaveListPage from './pages/LeaveListPage.jsx';
import AddLeavePage from './pages/AddLeavePage.jsx';
import LeaveDetailsPage from './pages/LeaveDetailsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import SalaryListPage from './pages/SalaryListPage.jsx';
import AddSalaryPage from './pages/AddSalaryPage.jsx';
import EditSalaryPage from './pages/EditSalaryPage.jsx';
import SalaryDetailsPage from './pages/SalaryDetailsPage.jsx';
import TaskListPage from './pages/TaskListPage.jsx';
import AddTaskPage from './pages/AddTaskPage.jsx';
import TaskDetailsPage from './pages/TaskDetailsPage.jsx';
import EditTaskPage from './pages/EditTaskPage.jsx';
import MyTasksPage from './pages/MyTasksPage.jsx';
import EmployeeTaskDetailsPage from './pages/EmployeeTaskDetailsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ActivityCenterPage from './pages/ActivityCenterPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import SubmitWorkPage from './pages/SubmitWorkPage.jsx';
import EmployeeSubmissionsPage from './pages/EmployeeSubmissionsPage.jsx';
import EmployeeSubmissionDetailsPage from './pages/EmployeeSubmissionDetailsPage.jsx';
import AdminSubmissionsPage from './pages/AdminSubmissionsPage.jsx';
import AdminSubmissionReviewPage from './pages/AdminSubmissionReviewPage.jsx';
import EmployeeLeavePage from './pages/EmployeeLeavePage.jsx';
import RequestLeavePage from './pages/RequestLeavePage.jsx';
import EmployeeLeaveDetailsPage from './pages/EmployeeLeaveDetailsPage.jsx';
import EmployeeSalaryPage from './pages/EmployeeSalaryPage.jsx';
import PayslipPage from './pages/PayslipPage.jsx';
import PerformancePage from './pages/PerformancePage.jsx';
import AddPerformancePage from './pages/AddPerformancePage.jsx';
import PerformanceDetailsPage from './pages/PerformanceDetailsPage.jsx';
import GoalListPage from './pages/GoalListPage.jsx';
import AddGoalPage from './pages/AddGoalPage.jsx';
import EditGoalPage from './pages/EditGoalPage.jsx';
import GoalDetailsPage from './pages/GoalDetailsPage.jsx';
import EmployeePerformancePage from './pages/EmployeePerformancePage.jsx';
import EmployeeGoalDetailsPage from './pages/EmployeeGoalDetailsPage.jsx';
import EmployeeGoalsPage from './pages/EmployeeGoalsPage.jsx';
import DocumentListPage from './pages/DocumentListPage.jsx';
import AddDocumentPage from './pages/AddDocumentPage.jsx';
import DocumentDetailsPage from './pages/DocumentDetailsPage.jsx';
import AuditLogsPage from './pages/AuditLogsPage.jsx';
import EmployeeDocumentsPage from './pages/EmployeeDocumentsPage.jsx';
import EmployeeDocumentDetailsPage from './pages/EmployeeDocumentDetailsPage.jsx';
import AnnouncementListPage from './pages/AnnouncementListPage.jsx';
import AddAnnouncementPage from './pages/AddAnnouncementPage.jsx';
import EditAnnouncementPage from './pages/EditAnnouncementPage.jsx';
import AnnouncementDetailsPage from './pages/AnnouncementDetailsPage.jsx';
import EmployeeNoticeBoardPage from './pages/EmployeeNoticeBoardPage.jsx';
import EmployeeAnnouncementDetailsPage from './pages/EmployeeAnnouncementDetailsPage.jsx';
import AdminAttendancePage from './pages/AdminAttendancePage.jsx';
import AdminEmployeeAttendancePage from './pages/AdminEmployeeAttendancePage.jsx';
import HelpCenterPage from './pages/HelpCenterPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import VerifyOtpPage from './pages/VerifyOtpPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <SettingsProvider>
              <SocketProvider>
                <NotificationProvider>
                  <Routes>
                    {/* Root Redirect */}
                    <Route path="/" element={<RootRoute />} />
                    
                    {/* Public Route: Login */}
                    <Route
                      path="/login"
                      element={
                        <PublicRoute>
                          <LoginPage />
                        </PublicRoute>
                      }
                    />

                    {/* Public Password Recovery Routes */}
                    <Route
                      path="/forgot-password"
                      element={
                        <PublicRoute>
                          <ForgotPasswordPage />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/verify-otp"
                      element={
                        <PublicRoute>
                          <VerifyOtpPage />
                        </PublicRoute>
                      }
                    />
                    <Route
                      path="/reset-password"
                      element={
                        <PublicRoute>
                          <ResetPasswordPage />
                        </PublicRoute>
                      }
                    />

                    {/* Standalone Change Password Route */}
                    <Route
                      path="/change-password"
                      element={
                        <ProtectedRoute>
                          <ChangePasswordPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Protected Routes wrapped in DashboardLayout */}
                    <Route
                      element={
                        <ProtectedRoute>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      {/* 1. Admin Dashboard (Admin Only) */}
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <DashboardPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* 2. Manager Dashboard (Manager Only) */}
                      <Route
                        path="/manager/dashboard"
                        element={
                          <ProtectedRoute requiredRoles={['manager']}>
                            <ManagerDashboardPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* 3. Employee Dashboard (Employee Only) */}
                      <Route
                        path="/employee/dashboard"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeeDashboardPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* 4. Employee Attendance (Employee, Manager, Admin) */}
                      <Route
                        path="/employee/attendance"
                        element={
                          <ProtectedRoute requiredRoles={['employee', 'manager', 'admin']}>
                            <MyAttendancePage />
                          </ProtectedRoute>
                        }
                      />

                      {/* 5. Employee Task Management: Employee Only */}
                      <Route
                        path="/employee/tasks"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <MyTasksPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee/tasks/:id"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeeTaskDetailsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee/tasks/:id/submit"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <SubmitWorkPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee/submissions"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeeSubmissionsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee/submissions/:id"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeeSubmissionDetailsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Employee Leave Management Routes */}
                      <Route
                        path="/employee/leave"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeeLeavePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee/leave/add"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <RequestLeavePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee/leave/:id"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeeLeaveDetailsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Employee Salary & Payslip Routes */}
                      <Route
                        path="/employee/salary"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeeSalaryPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee/salary/:id"
                        element={
                          <ProtectedRoute requiredRoles={['employee', 'admin']}>
                            <PayslipPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Employee Performance Routes */}
                      <Route
                        path="/employee/performance"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeePerformancePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee/performance/goals"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeeGoalsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee/performance/goals/:id"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeeGoalDetailsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Employee Directory: Admin & Manager */}
                      <Route
                        path="/employees"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <EmployeeListPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Add Employee: Admin Only */}
                      <Route
                        path="/employees/add"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <AddEmployeePage />
                          </ProtectedRoute>
                        }
                      />

                      {/* View Employee: Admin, Manager, Employee */}
                      <Route
                        path="/employees/:id"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager', 'employee']}>
                            <EmployeeDetailsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Edit Employee: Admin Only */}
                      <Route
                        path="/employees/:id/edit"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <EditEmployeePage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Admin Attendance Routes */}
                      <Route
                        path="/attendance"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <AdminAttendancePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/attendance/:employeeId"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <AdminEmployeeAttendancePage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Department Management Routes */}
                      <Route
                        path="/departments"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <DepartmentListPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/departments/add"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <AddDepartmentPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/departments/:id"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <DepartmentDetailsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/departments/:id/edit"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <EditDepartmentPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Leave Management Routes */}
                      <Route
                        path="/leaves"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <LeaveListPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/leaves/add"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <AddLeavePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/leaves/:id"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <LeaveDetailsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Reports (Admin & Manager) */}
                      <Route
                        path="/reports"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <ReportsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Performance Management Routes: Admin & Manager */}
                      <Route
                        path="/performance"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <PerformancePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/performance/reviews/add"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <AddPerformancePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/performance/:id"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <PerformanceDetailsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/performance/goals"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <GoalListPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/performance/goals/add"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <AddGoalPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/performance/goals/:id"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <GoalDetailsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/performance/goals/:id/edit"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <EditGoalPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Salary Management Routes: Admin Only */}
                      <Route
                        path="/salary"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <SalaryListPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/salary/add"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <AddSalaryPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/salary/:id"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <SalaryDetailsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/salary/:id/edit"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <EditSalaryPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Task Management Routes: Admin & Manager */}
                      <Route
                        path="/tasks"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <TaskListPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/tasks/add"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <AddTaskPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/tasks/:id"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <TaskDetailsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/tasks/:id/edit"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <EditTaskPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Work Submission & Review Routes: Admin & Manager */}
                      <Route
                        path="/submissions"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <AdminSubmissionsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/submissions/:id"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <AdminSubmissionReviewPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Audit Logs (Admin only) */}
                      <Route
                        path="/audit-logs"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <AuditLogsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Manager Routes */}
                      <Route
                        path="/manager/team"
                        element={
                          <ProtectedRoute requiredRoles={['manager']}>
                            <ManagerTeamPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/manager/team/:id"
                        element={
                          <ProtectedRoute requiredRoles={['manager']}>
                            <ManagerTeamMemberPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/manager/tasks"
                        element={
                          <ProtectedRoute requiredRoles={['manager']}>
                            <ManagerTasksPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/manager/leave"
                        element={
                          <ProtectedRoute requiredRoles={['manager']}>
                            <ManagerLeavePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/manager/submissions"
                        element={
                          <ProtectedRoute requiredRoles={['manager']}>
                            <ManagerSubmissionsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/manager/attendance"
                        element={
                          <ProtectedRoute requiredRoles={['manager']}>
                            <ManagerAttendancePage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/manager/performance"
                        element={
                          <ProtectedRoute requiredRoles={['manager']}>
                            <ManagerPerformancePage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Document Management: Admin & Manager */}
                      <Route
                        path="/documents"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <DocumentListPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/documents/add"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <AddDocumentPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/documents/:id"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager']}>
                            <DocumentDetailsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Employee Documents Vault: Employee Only */}
                      <Route
                        path="/employee/documents"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeeDocumentsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee/documents/:id"
                        element={
                          <ProtectedRoute requiredRoles={['employee']}>
                            <EmployeeDocumentDetailsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Company Announcements: Admin */}
                      <Route
                        path="/announcements"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <AnnouncementListPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/announcements/add"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <AddAnnouncementPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/announcements/edit/:id"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <EditAnnouncementPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/announcements/:id"
                        element={
                          <ProtectedRoute requiredRoles={['admin']}>
                            <AnnouncementDetailsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Employee / Manager Notice Board */}
                      <Route
                        path="/employee/announcements"
                        element={
                          <ProtectedRoute requiredRoles={['employee', 'manager', 'admin']}>
                            <EmployeeNoticeBoardPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee/announcements/:id"
                        element={
                          <ProtectedRoute requiredRoles={['employee', 'manager', 'admin']}>
                            <EmployeeAnnouncementDetailsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Notifications: All Authenticated Roles */}
                      <Route
                        path="/notifications"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager', 'employee']}>
                            <NotificationsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Activity Center: All Authenticated Roles */}
                      <Route
                        path="/activity"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager', 'employee']}>
                            <ActivityCenterPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Profile Management: All Authenticated Roles */}
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager', 'employee']}>
                            <ProfilePage />
                          </ProtectedRoute>
                        }
                      />

                      {/* System & Personal Settings: All Authenticated Roles */}
                      <Route
                        path="/settings"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager', 'employee']}>
                            <SettingsPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* Help Center: All Authenticated Roles */}
                      <Route
                        path="/help-center"
                        element={
                          <ProtectedRoute requiredRoles={['admin', 'manager', 'employee']}>
                            <HelpCenterPage />
                          </ProtectedRoute>
                        }
                      />

                      {/* 404 Not Found Page */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                  </Routes>
                </NotificationProvider>
              </SocketProvider>
            </SettingsProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
