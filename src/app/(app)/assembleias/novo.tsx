import { FormAssembleia } from '@/components/assembleias/FormAssembleia';
import { AppHeader, Screen } from '@/components/ui';

export default function NovaAssembleia() {
  return (
    <Screen>
      <AppHeader title="Convocar assembleia" back subtitle="Depois de criar, adicione as pautas" />
      <FormAssembleia />
    </Screen>
  );
}
