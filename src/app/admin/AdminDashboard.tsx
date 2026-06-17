'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listOnboardings,
  createOnboarding,
  deleteOnboarding,
  listFiles,
  uploadLogo,
  type OnboardingData,
  type AdminFile,
} from '@/lib/api-client'
import type {
  Sections,
  PayrollAnswers,
  EmployeesData,
  BudgetData,
  InventoryData,
  IntegrationsData,
} from '@/lib/onboarding-config'

const SECS: { id: keyof Sections; label: string }[] = [
  { id: 'employees', label: 'Medarbejdere' },
  { id: 'payroll', label: 'Løn & Regler' },
  { id: 'budget', label: 'Budget' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'integrations', label: 'Integrationer & POS' },
]

const pad = (n: number) => String(n || 0).padStart(2, '0')

function linkFor(id: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/form/${id}`
}

export default function AdminDashboard({ userEmail }: { userEmail: string }) {
  const [list, setList] = useState<OnboardingData[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copyShow, setCopyShow] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await listOnboardings())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const flashCopy = useCallback(() => {
    setCopyShow(true)
    setTimeout(() => setCopyShow(false), 1800)
  }, [])

  const copyLink = useCallback(
    (id: string) => {
      navigator.clipboard.writeText(linkFor(id)).catch(() => {})
      flashCopy()
    },
    [flashCopy],
  )

  const count = list.length

  return (
    <div className="admin-body">
      <div className="header">
        <div className="logo">dully.</div>
        <div className="hdivider" />
        <div className="htitle">Onboarding Admin</div>
        <div className="hbadge">
          {count} kunde{count === 1 ? '' : 'r'}
        </div>
        <div className="hspacer" />
        <span className="admin-email">{userEmail}</span>
        <form action="/auth/signout" method="post">
          <button className="signout-btn" type="submit">
            Log ud
          </button>
        </form>
      </div>

      <div className="admin-page">
        <div className="topbar">
          <div>
            <div className="page-title">Onboardings</div>
            <div className="page-sub">Opret og følg status på kunders onboarding</div>
          </div>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            + Ny onboarding
          </button>
        </div>

        {loading ? (
          <div className="empty">
            <div className="empty-sub" style={{ margin: 0 }}>
              Henter...
            </div>
          </div>
        ) : list.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <div className="empty-title">Ingen onboardings endnu</div>
            <div className="empty-sub">Opret den første ved at klikke på knappen ovenfor.</div>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              + Ny onboarding
            </button>
          </div>
        ) : (
          list.map((ob) => (
            <CustomerCard
              key={ob.id}
              ob={ob}
              expanded={expanded === ob.id}
              onToggle={() => setExpanded((cur) => (cur === ob.id ? null : ob.id))}
              onCopy={() => copyLink(ob.id)}
              refresh={load}
            />
          ))
        )}
      </div>

      {modalOpen && (
        <CreateModal
          onClose={() => setModalOpen(false)}
          onCreated={load}
          onCopy={flashCopy}
        />
      )}

      <div className={`copy-feedback${copyShow ? ' show' : ''}`}>Link kopieret ✓</div>
    </div>
  )
}

function CustomerCard({
  ob,
  expanded,
  onToggle,
  onCopy,
  refresh,
}: {
  ob: OnboardingData
  expanded: boolean
  onToggle: () => void
  onCopy: () => void
  refresh: () => void
}) {
  const sections = ob.sections || {}
  const done = SECS.filter((s) => sections[s.id]?.completed).length
  const skipped = SECS.filter((s) => sections[s.id]?.skipped && !sections[s.id]?.completed).length
  const total = SECS.length
  const pct = Math.round(((done + skipped) / total) * 100)
  const isComplete = ob.completedAt != null
  const isNew = done === 0 && skipped === 0

  const initials = ob.customerName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  const created = new Date(ob.createdAt).toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="card">
      <div className="card-main" onClick={onToggle}>
        <div className="card-avatar">
          {ob.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="card-avatar-img" src={ob.logoUrl} alt="" />
          ) : (
            initials
          )}
        </div>
        <div className="card-info">
          <div className="card-name">{ob.customerName}</div>
          <div className="card-meta">Oprettet: {created}</div>
        </div>
        {isComplete ? (
          <span className="status-badge complete">✓ Færdig</span>
        ) : isNew ? (
          <span className="status-badge new">Ikke startet</span>
        ) : (
          <span className="status-badge inprogress">
            {done}/{total} sektioner
          </span>
        )}
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-secondary btn-sm" onClick={onCopy}>
            Kopiér link
          </button>
        </div>
      </div>

      {expanded && (
        <div className="progress-wrap">
          <div className="progress-label">
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)' }}>
              Fremgang
            </span>
            <span className="progress-pct">{pct}%</span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill${isComplete ? ' complete' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="sections-row">
            {SECS.map((s) => {
              const sd = sections[s.id]
              const cls = sd?.completed ? 'done' : sd?.skipped ? 'skipped' : 'pending'
              return (
                <div className={`sec-pill ${cls}`} key={s.id}>
                  <div className="sec-dot" />
                  {s.label}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <div className="link-box" style={{ flex: 1 }}>
              <div className="link-url">{linkFor(ob.id)}</div>
              <button className="link-copy" onClick={onCopy}>
                Kopiér
              </button>
            </div>
            <a href={linkFor(ob.id)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <button className="btn btn-secondary btn-sm">Åbn →</button>
            </a>
          </div>

          <LogoRow ob={ob} onUploaded={refresh} />

          <Submission ob={ob} />

          <DeleteRow id={ob.id} onDeleted={refresh} />
        </div>
      )}
    </div>
  )
}

function LogoRow({ ob, onUploaded }: { ob: OnboardingData; onUploaded: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const handle = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      await uploadLogo(ob.id, file)
      onUploaded()
    } catch {
      alert('Logo-upload fejlede. Prøv igen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
      {ob.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ob.logoUrl}
          alt=""
          style={{
            width: 36,
            height: 36,
            objectFit: 'contain',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: '#fff',
          }}
        />
      )}
      <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? 'Uploader...' : ob.logoUrl ? 'Skift logo' : '+ Tilføj logo'}
      </button>
      <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
        Vises på kundens onboarding-side
      </span>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          handle(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}

function DeleteRow({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!confirming) {
    return (
      <div style={{ marginTop: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)}>
          Slet
        </button>
      </div>
    )
  }
  return (
    <div className="delete-confirm">
      <span>Er du sikker? Dette kan ikke fortrydes.</span>
      <button
        className="btn btn-danger btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await deleteOnboarding(id)
            onDeleted()
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Sletter...' : 'Slet permanent'}
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
        Annuller
      </button>
    </div>
  )
}

function Submission({ ob }: { ob: OnboardingData }) {
  const [files, setFiles] = useState<AdminFile[]>([])
  useEffect(() => {
    listFiles(ob.id)
      .then(setFiles)
      .catch(() => {})
  }, [ob.id])

  const s = ob.sections || {}
  const groups = buildGroups(s)
  const hasAny = groups.some((g) => g.rows.length > 0) || files.length > 0

  return (
    <div className="subm">
      <div className="subm-group-title" style={{ marginBottom: 14 }}>
        Indsendt indhold
      </div>
      {!hasAny && <div className="subm-empty">Kunden har ikke udfyldt noget endnu.</div>}

      {groups.map(
        (g) =>
          g.rows.length > 0 && (
            <div className="subm-group" key={g.title}>
              <div className="subm-group-title">{g.title}</div>
              {g.rows.map((r, i) => (
                <div className="subm-row" key={i}>
                  <div className="subm-key">{r.key}</div>
                  <div className="subm-val">{r.val}</div>
                </div>
              ))}
            </div>
          ),
      )}

      {files.length > 0 && (
        <div className="subm-group">
          <div className="subm-group-title">Filer</div>
          <div>
            {files.map((f) =>
              f.url ? (
                <a className="file-dl" key={f.id} href={f.url} target="_blank" rel="noreferrer">
                  ↓ {f.fileName}
                </a>
              ) : (
                <span className="file-dl" key={f.id}>
                  {f.fileName}
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type Group = { title: string; rows: { key: string; val: string }[] }

function buildGroups(s: Sections): Group[] {
  const groups: Group[] = []

  const emp = s.employees as EmployeesData | undefined
  if (emp) {
    const rows: Group['rows'] = []
    if (emp.csvFile) rows.push({ key: 'Medarbejder-fil', val: emp.csvFile })
    if (emp.contractFiles?.length)
      rows.push({ key: 'Kontraktskabeloner', val: emp.contractFiles.join(', ') })
    groups.push({ title: 'Medarbejdere', rows })
  }

  const pay = (s.payroll?.answers ?? {}) as PayrollAnswers
  {
    const rows: Group['rows'] = []
    if (pay.loenperiodeFra) rows.push({ key: 'Lønperiode starter', val: `den ${pay.loenperiodeFra}.` })
    if (pay.loensystem) rows.push({ key: 'Lønsystem', val: pay.loensystem })
    ;(pay.pauseRules ?? []).forEach((r, i) =>
      rows.push({
        key: i === 0 ? 'Pauseregler' : '',
        val: `Vagt over ${pad(r.shiftH)}:${pad(r.shiftM)}:${pad(r.shiftS)} → pause ${pad(r.breakH)}:${pad(r.breakM)}:${pad(r.breakS)}`,
      }),
    )
    ;(pay.wageSups ?? []).forEach((w, i) =>
      rows.push({
        key: i === 0 ? 'Faste løntillæg' : '',
        val: `${w.day}${w.type === 'from_time' ? ` fra ${w.startTime}` : ' (hele dagen)'} · ${w.rate} kr.`,
      }),
    )
    ;(pay.shiftTypes ?? []).forEach((st, i) =>
      rows.push({
        key: i === 0 ? 'Shift-typer' : '',
        val: `${st.title} · ${st.amount} kr. ${st.bonusMode === 'per_hour' ? 'pr. time' : 'pr. vagt'}`,
      }),
    )
    groups.push({ title: 'Løn & Regler', rows })
  }

  const bud = s.budget as BudgetData | undefined
  {
    const rows: Group['rows'] = []
    if (bud?.skipped) rows.push({ key: 'Status', val: 'Sprunget over' })
    if (bud?.budgetFile) rows.push({ key: 'Budget-fil', val: bud.budgetFile })
    if (bud?.answers?.budgetNotes) rows.push({ key: 'Kommentar', val: bud.answers.budgetNotes })
    groups.push({ title: 'Budget', rows })
  }

  const inv = s.inventory as InventoryData | undefined
  {
    const rows: Group['rows'] = []
    if (inv?.skipped) rows.push({ key: 'Status', val: 'Sprunget over' })
    if (inv?.inventoryFile) rows.push({ key: 'Leverandørliste', val: inv.inventoryFile })
    if (inv?.answers?.inventoryNotes) rows.push({ key: 'Noter', val: inv.answers.inventoryNotes })
    groups.push({ title: 'Inventory', rows })
  }

  const integ = (s.integrations as IntegrationsData | undefined)?.answers ?? {}
  {
    const labels: Record<string, string> = {
      pos: 'POS-system',
      payrollSystem: 'Lønsystem pr. afdeling',
      delivery: 'Leveringsplatforme',
      itContact: 'IT / teknisk kontakt',
    }
    const rows: Group['rows'] = Object.entries(integ)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => ({ key: labels[k] ?? k, val: String(v) }))
    groups.push({ title: 'Integrationer & POS', rows })
  }

  return groups
}

function CreateModal({
  onClose,
  onCreated,
  onCopy,
}: {
  onClose: () => void
  onCreated: () => void
  onCopy: () => void
}) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [error, setError] = useState('')

  const create = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError('')
    try {
      const ob = await createOnboarding(trimmed)
      const link = linkFor(ob.id)
      setCreatedLink(link)
      navigator.clipboard.writeText(link).catch(() => {})
      onCreated()
    } catch {
      setError('Noget gik galt. Prøv igen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {createdLink ? (
          <>
            <div className="modal-title">Link oprettet ✓</div>
            <div className="modal-sub">{name} er klar til onboarding. Linket er kopieret.</div>
            <div className="link-box">
              <div className="link-url">{createdLink}</div>
              <button
                className="link-copy"
                onClick={() => {
                  navigator.clipboard.writeText(createdLink).catch(() => {})
                  onCopy()
                }}
              >
                Kopiér
              </button>
            </div>
            <div className="modal-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={onClose}>
                Luk
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-title">Ny onboarding</div>
            <div className="modal-sub">
              Vi genererer et unikt link du kan sende direkte til kunden.
            </div>
            <div className="field">
              <label>Kundenavn</label>
              <input
                type="text"
                placeholder="fx OakBerry Nordic"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && create()}
                autoFocus
              />
            </div>
            {error && <div className="login-error">{error}</div>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>
                Annuller
              </button>
              <button className="btn btn-primary" onClick={create} disabled={busy}>
                {busy ? 'Opretter...' : 'Opret & kopiér link'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
