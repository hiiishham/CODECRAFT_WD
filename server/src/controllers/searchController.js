import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import Leave from '../models/Leave.js';
import WorkSubmission from '../models/WorkSubmission.js';
import Announcement from '../models/Announcement.js';
import Document from '../models/Document.js';
import Department from '../models/Department.js';
import Goal from '../models/Goal.js';
import Attendance from '../models/Attendance.js';
import mongoose from 'mongoose';
import { resolveEmployeeForUser } from '../utils/employeeResolver.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { getManagerTeamEmployeeIds } from './managerController.js';

/**
 * @desc    Global Search across all authorized modules
 * @route   GET /api/search
 * @access  Private
 */
export const globalSearch = async (req, res, next) => {
  try {
    const { q, module: filterModule } = req.query;
    
    const trimmedQuery = q ? q.trim() : '';
    if (!trimmedQuery || trimmedQuery.length < 2) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters long' });
    }

    const { role, _id, department: userDepartment } = req.user;
    const safeSearch = escapeRegex(trimmedQuery);
    const query = new RegExp(safeSearch, 'i');
    
    // Authorization Scope Definitions
    const isManager = role === 'manager';
    const isEmployee = role === 'employee';

    const resolvedEmp = isEmployee ? await resolveEmployeeForUser(req.user) : null;
    let teamEmpIds = [];
    if (isManager) {
      teamEmpIds = await getManagerTeamEmployeeIds(req.user);
    }

    // 1. Scope: Employees (Never returns salary)
    let empQuery = {
      $or: [
        { fullName: query },
        { email: query },
        { employeeId: query },
        { designation: query },
        { username: query },
      ]
    };
    if (isManager) empQuery._id = { $in: teamEmpIds };
    if (isEmployee) empQuery._id = resolvedEmp ? resolvedEmp._id : new mongoose.Types.ObjectId();

    // 2. Scope: Tasks
    let taskQuery = {
      $or: [
        { title: query },
        { description: query }
      ]
    };
    if (isManager) taskQuery.assignedTo = { $in: teamEmpIds };
    if (isEmployee) taskQuery.assignedTo = resolvedEmp ? resolvedEmp._id : new mongoose.Types.ObjectId();

    // 3. Scope: Leaves
    let leaveQuery = {
      $or: [
        { leaveType: query },
        { reason: query }
      ]
    };
    if (isManager) leaveQuery.employee = { $in: teamEmpIds };
    if (isEmployee) leaveQuery.employee = resolvedEmp ? resolvedEmp._id : new mongoose.Types.ObjectId();

    // 4. Scope: Work Submissions
    let subQuery = {
      $or: [
        { description: query },
        { githubUrl: query },
        { liveUrl: query }
      ]
    };
    if (isManager) subQuery.employee = { $in: teamEmpIds };
    if (isEmployee) subQuery.employee = resolvedEmp ? resolvedEmp._id : new mongoose.Types.ObjectId();

    // 5. Scope: Announcements (Role-based audience)
    let annQuery = {
      $or: [
        { title: query },
        { content: query }
      ]
    };
    if (isManager || isEmployee) {
      const audienceOr = [
        { audience: 'All' },
        { audience: role === 'manager' ? 'Managers' : 'Employees' }
      ];

      let deptName = userDepartment;
      if (isEmployee && resolvedEmp?.department) {
        deptName = resolvedEmp.department;
      }

      if (deptName) {
        let deptId = null;
        if (mongoose.Types.ObjectId.isValid(deptName)) {
          deptId = deptName;
        } else {
          const deptDoc = await Department.findOne({
            name: new RegExp(`^${escapeRegex(deptName.trim())}$`, 'i'),
          });
          if (deptDoc) deptId = deptDoc._id;
        }
        if (deptId) {
          audienceOr.push({ audience: 'Department', department: deptId });
        }
      }

      const now = new Date();
      annQuery.$and = [
        { status: 'Published' },
        { publishDate: { $lte: now } },
        {
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: null },
            { expiryDate: { $gte: now } },
          ],
        },
        { $or: audienceOr }
      ];
    }

    // 6. Scope: Documents
    let docQuery = {
      status: 'Active',
      $or: [
        { title: query },
        { description: query },
        { fileName: query },
        { documentType: query }
      ]
    };
    if (isEmployee) {
      docQuery.employee = resolvedEmp ? resolvedEmp._id : new mongoose.Types.ObjectId();
    } else if (isManager) {
      docQuery.employee = { $in: teamEmpIds };
    }

    // 7. Scope: Attendance
    let attendanceEmpFilter = {};
    if (isEmployee) {
      attendanceEmpFilter = { _id: resolvedEmp ? resolvedEmp._id : new mongoose.Types.ObjectId() };
    } else if (isManager) {
      attendanceEmpFilter = { _id: { $in: teamEmpIds } };
    }
    const matchingAttendanceEmps = await Employee.find({
      ...attendanceEmpFilter,
      $or: [
        { fullName: query },
        { employeeId: query }
      ]
    }).select('_id').lean();
    const matchingAttendanceEmpIds = matchingAttendanceEmps.map(e => e._id);

    let attendanceQuery = {
      $or: [
        { status: query },
        { notes: query },
        ...(matchingAttendanceEmpIds.length > 0 ? [{ employee: { $in: matchingAttendanceEmpIds } }] : [])
      ]
    };
    if (isEmployee) {
      attendanceQuery.employee = resolvedEmp ? resolvedEmp._id : new mongoose.Types.ObjectId();
    } else if (isManager) {
      attendanceQuery.employee = { $in: teamEmpIds };
    }

    // Run parallel queries (limited to 10 per module to keep payload small)
    const promises = [];
    
    const results = {
      employees: [],
      tasks: [],
      leaves: [],
      submissions: [],
      announcements: [],
      documents: [],
      attendance: []
    };

    if (!filterModule || filterModule === 'employees') {
      promises.push(
        Employee.find(empQuery)
          .select('fullName employeeId department designation profileImage status email')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .then(data => results.employees = data)
      );
    }
    
    if (!filterModule || filterModule === 'tasks') {
      promises.push(
        Task.find(taskQuery)
          .select('title priority status dueDate department assignedTo')
          .populate('assignedTo', 'fullName')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .then(data => results.tasks = data)
      );
    }
    
    if (!filterModule || filterModule === 'leaves') {
      promises.push(
        Leave.find(leaveQuery)
          .select('leaveType startDate endDate status employee')
          .populate('employee', 'fullName')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .then(data => results.leaves = data)
      );
    }
    
    if (!filterModule || filterModule === 'submissions') {
      promises.push(
        WorkSubmission.find(subQuery)
          .select('task employee status submittedAt description githubUrl liveUrl')
          .populate('task', 'title')
          .populate('employee', 'fullName')
          .sort({ submittedAt: -1, createdAt: -1 })
          .limit(10)
          .lean()
          .then(data => results.submissions = data)
      );
    }
    
    if (!filterModule || filterModule === 'announcements') {
      promises.push(
        Announcement.find(annQuery)
          .select('title priority status publishDate audience')
          .sort({ publishDate: -1, createdAt: -1 })
          .limit(10)
          .lean()
          .then(data => results.announcements = data)
      );
    }
    
    if (!filterModule || filterModule === 'documents') {
      promises.push(
        Document.find(docQuery)
          .select('title documentType fileName fileSize createdAt employee')
          .populate('employee', 'fullName employeeId')
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .then(data => results.documents = data)
      );
    }

    if (!filterModule || filterModule === 'attendance') {
      promises.push(
        Attendance.find(attendanceQuery)
          .select('date status checkIn checkOut totalHours notes employee')
          .populate('employee', 'fullName employeeId department')
          .sort({ date: -1, createdAt: -1 })
          .limit(10)
          .lean()
          .then(data => results.attendance = data)
      );
    }

    await Promise.all(promises);

    res.status(200).json({
      success: true,
      query: trimmedQuery,
      results
    });
  } catch (error) {
    next(error);
  }
};
