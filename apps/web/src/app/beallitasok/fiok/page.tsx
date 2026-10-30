import AccountStatus from "../../account-status";
import SettingsSection from "../settings-section";

export default function AccountSettingsPage() {
  return (
    <SettingsSection
      description="A bejelentkezett fiókodat és a munkamenetedet itt kezelheted."
      title="Fiókbeállítások"
    >
      <AccountStatus />
    </SettingsSection>
  );
}
