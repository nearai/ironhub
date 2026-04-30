"use client"

import { FormField } from "@/components/ironhub/agents/form-field"
import { SelectField } from "@/components/ironhub/agents/select-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type {
  AppearanceConfig,
  ApprovalPolicy,
  AvatarStyle,
  BuilderTheme,
  MemoryMode,
  PrivacyMode,
  SoulConfig,
} from "@/lib/agent-builder-types"

type SoulFormProps = {
  soul: SoulConfig
  appearance: AppearanceConfig
  onSoulChange: (soul: Partial<SoulConfig>) => void
  onAppearanceChange: (appearance: AppearanceConfig) => void
}

export function SoulForm({
  soul,
  appearance,
  onSoulChange,
  onAppearanceChange,
}: SoulFormProps) {
  return (
    <section className="grid gap-4 rounded-2xl border bg-card/80 p-5">
      <div>
        <h2 className="font-heading text-base font-medium">Soul system</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Identity, behavior, memory, and approval boundaries.
        </p>
      </div>
      <FormField label="Name">
        <Input
          value={soul.name}
          onChange={(event) => onSoulChange({ name: event.target.value })}
        />
      </FormField>
      <FormField label="Mission">
        <Textarea
          value={soul.mission}
          onChange={(event) => onSoulChange({ mission: event.target.value })}
          className="min-h-24 resize-none"
        />
      </FormField>
      <FormField label="Personality">
        <Textarea
          value={soul.personality}
          onChange={(event) => onSoulChange({ personality: event.target.value })}
          className="min-h-20 resize-none"
        />
      </FormField>
      <FormField label={`Autonomy ${soul.autonomy}%`}>
        <input
          type="range"
          min="0"
          max="100"
          value={soul.autonomy}
          onChange={(event) =>
            onSoulChange({ autonomy: Number(event.target.value) })
          }
          className="h-2 w-full accent-primary"
        />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Privacy"
          value={soul.privacyMode}
          values={["strict", "balanced", "open"]}
          onChange={(value) => onSoulChange({ privacyMode: value as PrivacyMode })}
        />
        <SelectField
          label="Memory"
          value={soul.memoryMode}
          values={["off", "session", "persistent"]}
          onChange={(value) => onSoulChange({ memoryMode: value as MemoryMode })}
        />
        <SelectField
          label="Approval"
          value={soul.approvalPolicy}
          values={["manual", "high-impact", "autonomous"]}
          onChange={(value) =>
            onSoulChange({ approvalPolicy: value as ApprovalPolicy })
          }
        />
        <SelectField
          label="Avatar"
          value={appearance.avatar}
          values={["paladin", "sentinel", "scholar", "oracle"]}
          onChange={(value) =>
            onAppearanceChange({ ...appearance, avatar: value as AvatarStyle })
          }
        />
        <SelectField
          label="Theme"
          value={appearance.theme}
          values={["iron", "ember", "arc", "signal"]}
          onChange={(value) =>
            onAppearanceChange({ ...appearance, theme: value as BuilderTheme })
          }
        />
      </div>
    </section>
  )
}
