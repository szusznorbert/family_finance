import SettingsSection from "../settings-section";
import CategoryManager from "./category-manager";

export default function CategoriesSettingsPage() {
  return (
    <SettingsSection
      description="A háztartás kiadásainak rendezéséhez használt kategóriák."
      title="Kiadási kategóriák"
    >
      <CategoryManager />
    </SettingsSection>
  );
}
