import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Card, CardBody } from "@/core/ui/card";
import { CopyButton } from "@/core/ui/copy-button";
import { formatDateTime } from "@/core/utils/format";
import { deleteDeploymentAction, saveDeploymentAction } from "../../deployment-actions";
import type { DeploymentInfo, DeploymentServiceType } from "../../deployment-types";
import { DeploymentFields } from "./deployment-fields";

const muted = "text-gray-500 dark:text-gray-400";

/** An organization's deployments as cards: the service type, its detail lines (copyable), remarks and who changed it. */
export function DeploymentList({
  deployments,
  serviceTypes,
  canManage,
}: {
  deployments: DeploymentInfo[];
  serviceTypes: DeploymentServiceType[];
  canManage: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {deployments.map((deployment) => (
        <Card key={deployment.id}>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{deployment.serviceType}</h3>
                <StatusBadge active={deployment.isActive} />
              </div>
              {canManage && (
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title={`Edit ${deployment.serviceType} deployment`}
                    action={saveDeploymentAction.bind(null, deployment.organizationObjectId, deployment.id)}
                    submitLabel="Save changes"
                    size="lg"
                  >
                    <DeploymentFields value={deployment} serviceTypes={serviceTypes} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteDeploymentAction.bind(null, deployment.id)}
                    itemLabel={`${deployment.serviceType} deployment`}
                    message="Its detail lines are deleted with it. Mark it inactive instead to keep the record."
                  />
                </span>
              )}
            </div>

            {deployment.details.length === 0 ? (
              <p className={`text-sm ${muted}`}>No details yet.</p>
            ) : (
              <ul className="space-y-2">
                {deployment.details.map((detail) => (
                  <li
                    key={detail.id}
                    className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]"
                  >
                    <span className="min-w-0 text-sm break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                      {detail.description}
                    </span>
                    <CopyButton value={detail.description} label="Copy" className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}

            {deployment.remarks && (
              <p className="text-sm whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                <Badge tone="gray">Remarks</Badge> <span className="ml-1">{deployment.remarks}</span>
              </p>
            )}

            <p className={`border-t border-gray-100 pt-3 text-xs dark:border-gray-800 ${muted}`}>
              Added {formatDateTime(deployment.createdDate)}
              {deployment.createdByName && ` by ${deployment.createdByName}`}
              {deployment.updatedDate && (
                <>
                  {" "}
                  · Last changed {formatDateTime(deployment.updatedDate)}
                  {deployment.updatedByName && ` by ${deployment.updatedByName}`}
                </>
              )}
            </p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
