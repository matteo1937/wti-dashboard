import { OrganizationSwitcher, UserButton } from "@clerk/clerk-react";
import type { UserRole } from "../types";

interface TeamHeaderProps {
  role: UserRole | null;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  mitglied: "Mitglied"
};

export function TeamHeader({ role }: TeamHeaderProps) {
  return (
    <div className="team-header">
      <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/" afterCreateOrganizationUrl="/" />
      <div className="team-header-right">
        {role && <span className={`role-badge role-${role}`}>{ROLE_LABEL[role]}</span>}
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}
