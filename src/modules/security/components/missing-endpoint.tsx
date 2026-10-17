/** Explains a 404 from the Security API, which ThinkTechErpAPI does not implement yet. */
export function SecurityEndpointHint({ endpoint }: { endpoint: string }) {
  return (
    <>
      ThinkTechErpAPI doesn&apos;t expose <code className="font-mono text-xs">{endpoint}</code> yet. The Security area
      (<code className="font-mono text-xs">Areas/Security</code>) is empty — implement the endpoints listed in the README&apos;s
      &ldquo;Security API contract&rdquo; and this screen will start working.
    </>
  );
}
