export type Role = "student" | "teacher" | "parent" | "admin";
export type UserStatus = "pending" | "active" | "disabled";

export type UserProfile = {
  id: string;
  fullName?: string;
  email?: string;
  role?: Role | "pending";
  status?: UserStatus;
  requestedRole?: Role | null;
  childStudentIds?: string[];
};

export type RootStackParamList = {
  Welcome: undefined;
  RoleAuth: { role: Role };
  Pending: undefined;
  StudentApp: undefined;
  TeacherApp: undefined;
  ParentApp: undefined;
  AdminApp: undefined;
};

export const roleTitles: Record<Role, string> = {
  student: "Student Portal",
  teacher: "Teacher Portal",
  parent: "Parent Portal",
  admin: "Admin Portal",
};

export const getUserDisplay = (user?: Partial<UserProfile> | null) =>
  user?.fullName || user?.email || "TechDonish user";
