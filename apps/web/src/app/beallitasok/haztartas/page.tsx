import HouseholdsPanel from "../../households-panel";
import SettingsSection from "../settings-section";

export default function HouseholdSettingsPage() {
  return (
    <SettingsSection
      description="Válaszd ki a háztartást, és kezeld a nevét."
      title="Háztartás"
    >
      <HouseholdsPanel showHeading={false} view="household" />
    </SettingsSection>
  );
}
