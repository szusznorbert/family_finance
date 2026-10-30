import SettingsSection from "../settings-section";
import FixedCostManager from "./fixed-cost-manager";

export default function FixedCostsSettingsPage() {
  return (
    <SettingsSection
      description="A háztartás havonta ismétlődő kiadásai."
      title="Havi fix költségek"
    >
      <FixedCostManager />
    </SettingsSection>
  );
}
