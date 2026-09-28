import mongoose from 'mongoose';

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      unique: true,
      // Ref can be Admin or Employee. We'll use a mixed approach or just store the ID.
      // Dynamic ref is possible, but typically we just query by ID since ID is globally unique in MongoDB.
    },
    userType: {
      type: String,
      enum: ['Admin', 'Employee'],
      required: true,
    },
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    categories: {
      task: { type: Boolean, default: true },
      leave: { type: Boolean, default: true },
      submission: { type: Boolean, default: true },
      announcement: { type: Boolean, default: true },
      attendance: { type: Boolean, default: true },
      performance: { type: Boolean, default: true },
      salary: { type: Boolean, default: true },
      system: { type: Boolean, default: true }, // critical notifications usually forced true
    },
  },
  { timestamps: true }
);

export default mongoose.model('NotificationPreference', notificationPreferenceSchema);
