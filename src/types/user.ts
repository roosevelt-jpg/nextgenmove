import type { Timestamp } from "firebase-admin/firestore";

export type UserRole = "admin" | "company" | "student";

export type UserStatus = "active" | "suspended";

export interface UserDocument {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  photoUrl: string | null;
  phone?: string | null;
  notificationPreferences?: Record<string, boolean>;
  createdAt: Timestamp;
  lastLoginAt: Timestamp | null;
  status: UserStatus;
}

export interface CurrentUser {
  uid: string;
  email: string | null;
  role: UserRole;
  displayName: string;
  photoUrl: string | null;
  status: UserStatus;
}

export type SignUpRole = "company" | "student";

export interface AuthLabels {
  signInTitle?: string;
  signUpTitle?: string;
  emailLabel?: string;
  passwordLabel?: string;
  displayNameLabel?: string;
  roleLabel?: string;
  roleCompanyLabel?: string;
  roleStudentLabel?: string;
  signInSubmitLabel?: string;
  signUpSubmitLabel?: string;
  signInLinkLabel?: string;
  signUpLinkLabel?: string;
  genericErrorLabel?: string;
  sign_in_failed?: string;
  register_failed?: string;
  [key: string]: string | undefined;
}
