"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GRADES = [
  "Grassroots",
  "Grade 8",
  "Grade 7",
  "Grade 6",
  "Grade 5",
  "Grade 4",
  "Grade 3",
  "Grade 2",
  "Grade 1",
];

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming",
];

interface User {
  name: string;
  email: string;
  badgeNumber: string | null;
  currentGrade: string | null;
  state: string | null;
}

export default function ProfileForm({ user }: { user: User }) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    badgeNumber: user.badgeNumber ?? "",
    currentGrade: user.currentGrade ?? "Grassroots",
    state: user.state ?? "",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [infoError, setInfoError] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setPwField(field: string, value: string) {
    setPasswords((p) => ({ ...p, [field]: value }));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setInfoMessage("");
    setInfoError("");
    setSaving(true);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (res.ok) {
      setInfoMessage("Profile saved.");
      router.refresh();
    } else {
      setInfoError(data.error || "Failed to save.");
    }
    setSaving(false);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage("");
    setPwError("");

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ...passwords }),
    });

    const data = await res.json();
    if (res.ok) {
      setPwMessage("Password updated.");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setPwError(data.error || "Failed to update password.");
    }
    setSavingPassword(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-brand-600 text-white px-4 py-4 flex items-center gap-3">
        <Link href="/dashboard" className="text-brand-100">← Back</Link>
        <h1 className="font-bold text-lg">Profile</h1>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">

        {/* Referee Info */}
        <form onSubmit={saveProfile} className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Referee Information</h2>

          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Badge Number</label>
            <input
              className="input"
              value={form.badgeNumber}
              onChange={(e) => setField("badgeNumber", e.target.value)}
              placeholder="e.g. 123456"
            />
          </div>

          <div>
            <label className="label">Current Grade</label>
            <select
              className="input"
              value={form.currentGrade}
              onChange={(e) => setField("currentGrade", e.target.value)}
            >
              {GRADES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="label">State Association</label>
            <select
              className="input"
              value={form.state}
              onChange={(e) => setField("state", e.target.value)}
            >
              <option value="">Select state...</option>
              {US_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {infoError && <p className="text-red-600 text-sm">{infoError}</p>}
          {infoMessage && <p className="text-brand-600 text-sm">{infoMessage}</p>}

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Change Password */}
        <form onSubmit={savePassword} className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Change Password</h2>

          <div>
            <label className="label">Current Password</label>
            <input
              className="input"
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPwField("currentPassword", e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="label">New Password</label>
            <input
              className="input"
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPwField("newPassword", e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <input
              className="input"
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPwField("confirmPassword", e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {pwError && <p className="text-red-600 text-sm">{pwError}</p>}
          {pwMessage && <p className="text-brand-600 text-sm">{pwMessage}</p>}

          <button
            type="submit"
            className="btn-secondary w-full"
            disabled={savingPassword || !passwords.currentPassword || !passwords.newPassword}
          >
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>

        {/* Sign Out */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-3">Account</h2>
          {!showLogoutConfirm ? (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="btn-danger w-full"
            >
              Sign Out
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center">Are you sure you want to sign out?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-danger"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
