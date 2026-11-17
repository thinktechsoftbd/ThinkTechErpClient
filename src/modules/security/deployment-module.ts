import { Server } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import { DEPLOYMENT_MANAGE_PERMISSION, DEPLOYMENT_VIEW_PERMISSION } from "./deployment-types";

/**
 * The /deployment screens (Security → Deployment in the menu table). Not in the module registry: it only
 * gates the pages, for users with the API's DeploymentView policy.
 */
export const deploymentModule = defineModule({
  key: "deployment",
  name: "Deployment",
  description: "What is deployed for each organization, by service type, with its details.",
  icon: Server,
  basePath: "/deployment",
  status: "active",
  accessPermissions: [DEPLOYMENT_VIEW_PERMISSION, DEPLOYMENT_MANAGE_PERMISSION],
  nav: [],
  permissions: [
    { key: DEPLOYMENT_VIEW_PERMISSION, label: "View organizations' deployment information" },
    { key: DEPLOYMENT_MANAGE_PERMISSION, label: "Add, edit and delete it" },
  ],
});
