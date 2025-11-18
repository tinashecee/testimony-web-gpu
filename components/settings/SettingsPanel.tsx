import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserManagementPanel } from "./panels/UserManagementPanel";
import { LicenseManagementPanel } from "./panels/LicenseManagementPanel";
import { AuditTrailPanel } from "./panels/AuditTrailPanel";
import { ReportsPanel } from "./panels/ReportsPanel";
import { CourtsPanel } from "./panels/CourtsPanel";

interface SettingsPanelProps {
  section: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const PANEL_CONTENT: Record<
  string,
  {
    title: string;
    description: string;
    component: React.ComponentType;
  }
> = {
  "user-management": {
    title: "User Management",
    description: "Manage user accounts, roles, and permissions",
    component: UserManagementPanel,
  },
  license: {
    title: "License Management",
    description: "View and manage active subscriptions",
    component: LicenseManagementPanel,
  },
  "audit-trail": {
    title: "Audit Trail",
    description: "View system activity and security logs",
    component: AuditTrailPanel,
  },
  reports: {
    title: "System Reports",
    description: "View comprehensive reports on system activity and performance",
    component: ReportsPanel,
  },
  courts: {
    title: "Courts",
    description: "Manage court locations and courtrooms",
    component: CourtsPanel,
  },
};

export function SettingsPanel({
  section,
  isOpen,
  onClose,
}: SettingsPanelProps) {
  const panelContent = section ? PANEL_CONTENT[section] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-7xl h-[90vh] overflow-y-auto p-6">
        {panelContent && (
          <>
            <DialogHeader className="space-y-1 mb-6">
              <DialogTitle>{panelContent.title}</DialogTitle>
              <DialogDescription>{panelContent.description}</DialogDescription>
            </DialogHeader>
            <div className="pr-2">
              <panelContent.component />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
