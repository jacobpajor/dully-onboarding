// Section data shapes (the `sections` blob owned by the frontend — see BACKEND_SPEC.md).

export type SectionMeta = { completed?: boolean; skipped?: boolean }

export type EmployeesData = SectionMeta & {
  csvFile?: string | null
  contractFiles?: string[]
}

export type PauseRule = {
  shiftH: number; shiftM: number; shiftS: number
  breakH: number; breakM: number; breakS: number
}
export type WageSup = {
  type: 'all_day' | 'from_time'
  day: string
  startTime: string
  rate: number
}
export type ShiftType = {
  title: string
  description: string
  amount: number
  bonusMode: 'per_hour' | 'one_time'
}
export type PayrollAnswers = {
  loenperiodeFra?: string
  loensystem?: string
  loensystemOther?: string
  pauseRules?: PauseRule[]
  wageSups?: WageSup[]
  shiftTypes?: ShiftType[]
}
export type PayrollData = SectionMeta & { answers?: PayrollAnswers }

export type BudgetData = SectionMeta & {
  budgetFile?: string | null
  answers?: { budgetNotes?: string }
}
export type InventoryData = SectionMeta & {
  answers?: { suppliers?: string; inventoryNotes?: string }
}
export type IntegrationsData = SectionMeta & {
  answers?: Record<string, string>
}

export type Sections = {
  employees?: EmployeesData
  payroll?: PayrollData
  budget?: BudgetData
  inventory?: InventoryData
  integrations?: IntegrationsData
}
export type SectionId = keyof Sections

export type IntegrationQuestion = { id: string; label: string; hint: string }
export type SectionConfig = {
  id: SectionId
  num: string
  title: string
  sublabel: string
  optional: boolean
  desc: string
  questions?: IntegrationQuestion[]
}

export const SECTIONS: SectionConfig[] = [
  { id: 'employees', num: '1', title: 'Medarbejdere', sublabel: 'CSV + kontrakter', optional: false, desc: 'Jeres team. Kan typisk eksporteres fra jeres nuværende system. Ellers udfyld skabelonen nedenfor.' },
  { id: 'payroll', num: '2', title: 'Løn & Regler', sublabel: '5 emner', optional: false, desc: 'De regler der styrer, hvordan timer og løn beregnes korrekt fra dag 1.' },
  {
    id: 'integrations', num: '3', title: 'Integrationer & POS', sublabel: '3 spørgsmål', optional: false,
    desc: 'Hvilke systemer I bruger, så vi kan sætte de rigtige integrationer op inden go-live.',
    questions: [
      { id: 'pos', label: 'POS-system', hint: 'Hvilket POS-system bruger I, og i hvilke afdelinger? (fx OnlinePOS, Qopla, andet)' },
      { id: 'delivery', label: 'Leveringsplatforme', hint: 'Bruger I Wolt, Foodora, Uber Eats, og via hvilken integration?' },
      { id: 'itContact', label: 'IT / teknisk kontakt', hint: 'Navn og e-mail på den person vi koordinerer integrationsopsætning med.' },
    ],
  },
  { id: 'budget', num: '4', title: 'Budget', sublabel: 'Valgfrit', optional: true, desc: 'Dagligt omsætningsbudget pr. afdeling inkl. moms. Giver Dully mulighed for at beregne lønprocent og sætte advarsler op i vagtplanen.' },
  { id: 'inventory', num: '5', title: 'Inventory', sublabel: 'Valgfrit', optional: true, desc: 'Leverandøroversigt til opsætning af ordresystem. Blokerer ikke go-live. Kan tilføjes efter opstart.' },
]

export const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag']
export const LOENSYSTEMER = ['Danløn', 'Dataløn', 'Salary', 'Zenegy', 'Andet']
