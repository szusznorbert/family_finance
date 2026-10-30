import HouseholdsPanel from "../../households-panel";
import SettingsSection from "../settings-section";

export default function MembersSettingsPage() {
  return (
    <SettingsSection
      description="Válaszd ki a háztartást a tagok és meghívók kezeléséhez."
      title="Tagok és meghívók"
    >
      <HouseholdsPanel showHeading={false} view="members" />
    </SettingsSection>
  );
}
