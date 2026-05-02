"use client"

import { FormField } from "@/components/ironhub/agents/form-field"
import { SelectField } from "@/components/ironhub/agents/select-field"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  onBack: () => void
  onContinue: () => void
}

export function SoulForm({
  soul,
  appearance,
  onSoulChange,
  onAppearanceChange,
  onBack,
  onContinue,
}: SoulFormProps) {
  return (
    <Card className="bg-card/80">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Soul system</CardTitle>
            <CardDescription>
              Define identity, behavior, memory, and approval boundaries.
            </CardDescription>
          </div>
          <Badge variant="outline">Step 2</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name">
            <Input
              value={soul.name}
              onChange={(event) => onSoulChange({ name: event.target.value })}
            />
          </FormField>
          <FormField label="Persona Title">
            <Input
              value={soul.title}
              onChange={(event) => onSoulChange({ title: event.target.value })}
            />
          </FormField>
        </div>
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
            onChange={(event) =>
              onSoulChange({ personality: event.target.value })
            }
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
            onChange={(value) =>
              onSoulChange({ privacyMode: value as PrivacyMode })
            }
          />
          <SelectField
            label="Memory"
            value={soul.memoryMode}
            values={["off", "session", "persistent"]}
            onChange={(value) =>
              onSoulChange({ memoryMode: value as MemoryMode })
            }
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
            label="Avatar placeholder"
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
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" onClick={onContinue}>
            Choose loadout
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
