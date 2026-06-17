'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SECTIONS,
  DAYS,
  LOENSYSTEMER,
  type Sections,
  type SectionId,
  type SectionConfig,
  type EmployeesData,
  type PayrollData,
  type PayrollAnswers,
  type BudgetData,
  type InventoryData,
  type IntegrationsData,
  type PauseRule,
  type WageSup,
  type ShiftType,
} from '@/lib/onboarding-config'
import {
  fetchOnboarding,
  saveSections,
  completeOnboarding,
  uploadFile,
  type OnboardingData,
} from '@/lib/api-client'

const pad = (n: number) => String(n || 0).padStart(2, '0')

type Phase = 'loading' | 'error' | 'welcome' | 'app' | 'done'

export default function CustomerForm({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [record, setRecord] = useState<OnboardingData | null>(null)
  const [cur, setCur] = useState(0)
  const [savedShow, setSavedShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const sectionsRef = useRef<Sections>({})
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true
    fetchOnboarding(token).then((data) => {
      if (!active) return
      if (!data) {
        setPhase('error')
        return
      }
      data.sections = data.sections || {}
      sectionsRef.current = data.sections
      setRecord(data)
      if (data.completedAt) {
        setPhase('done')
        return
      }
      const idx = SECTIONS.findIndex((s) => {
        const sd = data.sections[s.id]
        return !sd?.completed && !sd?.skipped
      })
      setCur(idx < 0 ? 0 : idx)
      setPhase('welcome')
    })
    return () => {
      active = false
    }
  }, [token])

  const flashSaved = useCallback(() => {
    setSavedShow(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedShow(false), 1600)
  }, [])

  // Single write path: update the ref, the state, and persist to the API.
  const applySections = useCallback(
    (next: Sections) => {
      sectionsRef.current = next
      setRecord((prev) => (prev ? { ...prev, sections: next } : prev))
      saveSections(token, next).then(flashSaved)
    },
    [token, flashSaved],
  )

  const setSection = useCallback(
    <K extends SectionId>(id: K, data: Sections[K]) => {
      applySections({ ...sectionsRef.current, [id]: data })
    },
    [applySections],
  )

  const upload = useCallback(
    async (section: string, field: string, file: File) => {
      const res = await uploadFile(token, section, field, file)
      return res.fileName
    },
    [token],
  )

  const goto = useCallback((i: number) => {
    setCur(i)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const goNext = useCallback(
    async (i: number) => {
      const s = SECTIONS[i]
      const sd = sectionsRef.current[s.id]
      if (!sd?.skipped) {
        setSection(s.id, { ...(sd ?? {}), completed: true } as Sections[typeof s.id])
      }
      if (i === SECTIONS.length - 1) {
        setSubmitting(true)
        await completeOnboarding(token)
        setRecord((prev) => (prev ? { ...prev, completedAt: new Date().toISOString() } : prev))
        setSubmitting(false)
        setPhase('done')
      } else {
        goto(i + 1)
      }
    },
    [goto, setSection, token],
  )

  if (phase === 'loading') {
    return (
      <div className="fullscreen">
        <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Henter...</div>
      </div>
    )
  }

  if (phase === 'error' || !record) {
    return (
      <div className="fullscreen">
        <div style={{ fontSize: 40, marginBottom: 8 }}>!</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Ugyldigt link</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: 14, maxWidth: 360, lineHeight: '21px' }}>
          Dette onboarding-link er ikke gyldigt eller er udløbet. Kontakt Dully for et nyt link.
        </p>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header customerName={record.customerName} />
        <div className="fullscreen" style={{ minHeight: 'calc(100vh - 56px)' }}>
          <div className="completion-icon">✓</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 8 }}>
            Alt er sendt. Tak!
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: 14, maxWidth: 380, lineHeight: '21px' }}>
            Vi har modtaget jeres information og vender tilbage hurtigst muligt. Har I spørgsmål undervejs,
            er I altid velkomne til at skrive til os.
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'welcome') {
    return (
      <div className="welcome-page">
        <div className="header">
          <div className="logo">dully.</div>
          <div className="hdivider" />
          <div className="htitle">Onboarding</div>
        </div>
        <div className="welcome-body">
          {record.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="welcome-logo-img" src={record.logoUrl} alt={record.customerName} />
          ) : (
            <div className="welcome-logo-mark">d.</div>
          )}
          <div className="welcome-customer">{record.customerName}</div>
          <h1 className="welcome-title">Velkommen til Dully</h1>
          <p className="welcome-desc">
            Vi skal bruge lidt information fra jer for at opsætte Dully korrekt.
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: '12px 32px', fontSize: 15 }}
            onClick={() => setPhase('app')}
          >
            Kom i gang
          </button>
        </div>
      </div>
    )
  }

  const sections = record.sections
  const doneCount = SECTIONS.filter((s) => {
    const d = sections[s.id]
    return d?.completed || d?.skipped
  }).length
  const section = SECTIONS[cur]

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Header customerName={record.customerName} />
      <div className="pbar">
        <div className="pbar-fill" style={{ width: `${(doneCount / SECTIONS.length) * 100}%` }} />
      </div>
      <div className="mobile-steps">
        {SECTIONS.map((s, i) => {
          const d = sections[s.id]
          const active = i === cur
          const cls = `mpill${active ? ' active' : d?.completed ? ' done' : ''}`
          return (
            <div key={s.id} className={cls} onClick={() => goto(i)}>
              {s.num}. {s.title}
            </div>
          )
        })}
      </div>
      <div className="layout">
        <Sidebar sections={sections} cur={cur} onGoto={goto} />
        <main className="content">
          <SectionView
            key={section.id}
            section={section}
            sections={sections}
            token={token}
            cur={cur}
            submitting={submitting}
            setSection={setSection}
            upload={upload}
            onBack={() => cur > 0 && goto(cur - 1)}
            onNext={() => goNext(cur)}
          />
        </main>
      </div>
      <div className={`save-indicator${savedShow ? ' show' : ''}`}>Gemt</div>
    </div>
  )
}

function Header({ customerName }: { customerName: string }) {
  return (
    <div className="header">
      <div className="logo">dully.</div>
      <div className="hdivider" />
      <div className="htitle">Onboarding</div>
      <div className="hcustomer">{customerName}</div>
    </div>
  )
}

function Sidebar({
  sections,
  cur,
  onGoto,
}: {
  sections: Sections
  cur: number
  onGoto: (i: number) => void
}) {
  return (
    <aside className="sidebar">
      {SECTIONS.map((s, i) => {
        const sd = sections[s.id]
        const done = sd?.completed
        const skip = sd?.skipped
        const active = i === cur
        const ic = done ? 'done' : skip ? 'skip' : active ? 'cur' : ''
        const ico = done ? '✓' : skip ? '/' : s.num
        return (
          <div key={s.id} className={`sitem${active ? ' active' : ''}`} onClick={() => onGoto(i)}>
            <div className={`step-icon ${ic}`}>{ico}</div>
            <div className="stext">
              <div className={`slabel${!active && !done && !skip ? ' dim' : ''}`}>{s.title}</div>
              {done ? (
                <div className="ssub green">Udfyldt</div>
              ) : skip ? (
                <div className="ssub">Springes over</div>
              ) : s.optional ? (
                <div className="ssub">Valgfrit</div>
              ) : null}
            </div>
          </div>
        )
      })}
    </aside>
  )
}

function SectionView({
  section,
  sections,
  token,
  cur,
  submitting,
  setSection,
  upload,
  onBack,
  onNext,
}: {
  section: SectionConfig
  sections: Sections
  token: string
  cur: number
  submitting: boolean
  setSection: <K extends SectionId>(id: K, data: Sections[K]) => void
  upload: (section: string, field: string, file: File) => Promise<string>
  onBack: () => void
  onNext: () => void
}) {
  const sd = sections[section.id]
  const isLast = cur === SECTIONS.length - 1

  return (
    <>
      <div className="sec-label">
        Del {section.num} af {SECTIONS.length}
      </div>
      <h1 className="sec-title">{section.title}</h1>
      <p className="sec-desc">{section.desc}</p>

      {section.id === 'employees' && (
        <EmployeesSection
          data={(sd as EmployeesData) ?? {}}
          token={token}
          upload={upload}
          onChange={(d) => setSection('employees', d)}
        />
      )}
      {section.id === 'payroll' && (
        <PayrollSection
          data={(sd as PayrollData) ?? {}}
          onChange={(d) => setSection('payroll', d)}
        />
      )}
      {section.id === 'budget' && (
        <BudgetSection
          data={(sd as BudgetData) ?? {}}
          upload={upload}
          onChange={(d) => setSection('budget', d)}
        />
      )}
      {section.id === 'inventory' && (
        <InventorySection
          data={(sd as InventoryData) ?? {}}
          upload={upload}
          onChange={(d) => setSection('inventory', d)}
        />
      )}
      {section.id === 'integrations' && (
        <IntegrationsSection
          section={section}
          data={(sd as IntegrationsData) ?? {}}
          onChange={(d) => setSection('integrations', d)}
        />
      )}

      <div className="actions">
        <button
          className="btn btn-secondary"
          onClick={onBack}
          style={cur === 0 ? { visibility: 'hidden' } : undefined}
        >
          ← Tilbage
        </button>
        <button className="btn btn-primary" onClick={onNext} disabled={submitting}>
          {isLast ? (submitting ? 'Sender...' : 'Send til Dully ✓') : 'Gem og fortsæt →'}
        </button>
      </div>
    </>
  )
}

// ── EMPLOYEES ──────────────────────────────────────────────────────────
function EmployeesSection({
  data,
  upload,
  onChange,
}: {
  data: EmployeesData
  token: string
  upload: (section: string, field: string, file: File) => Promise<string>
  onChange: (d: EmployeesData) => void
}) {
  const [busy, setBusy] = useState(false)
  const contracts = data.contractFiles ?? []

  const handleCsv = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const name = await upload('employees', 'csvFile', file)
      onChange({ ...data, csvFile: name })
    } catch {
      alert('Upload fejlede. Prøv igen.')
    } finally {
      setBusy(false)
    }
  }

  const addContract = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const name = await upload('employees', 'contractFiles', file)
      if (!contracts.includes(name)) onChange({ ...data, contractFiles: [...contracts, name] })
    } catch {
      alert('Upload fejlede. Prøv igen.')
    } finally {
      setBusy(false)
    }
  }

  const removeContract = (i: number) => {
    const next = contracts.slice()
    next.splice(i, 1)
    onChange({ ...data, contractFiles: next })
  }

  return (
    <>
      <div className="qgroup">
        <div className="qgroup-head">
          <div className="qgroup-title">Medarbejderdata</div>
          <div className="qgroup-hint">
            Download skabelonen, udfyld med jeres medarbejdere, og upload den her.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={downloadCSV}>
            ↓ Download CSV-skabelon
          </button>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Udfyld og upload nedenfor</span>
        </div>
        {data.csvFile ? (
          <div className="file-list">
            <div className="file-item">
              <div className="file-icon">📄</div>
              <div className="file-name">{data.csvFile}</div>
              <button className="file-remove" onClick={() => onChange({ ...data, csvFile: null })}>
                ×
              </button>
            </div>
          </div>
        ) : (
          <FilePicker accept=".csv,.xlsx" disabled={busy} onPick={handleCsv}>
            <div className="upload-area">
              <div className="upload-icon">📄</div>
              <div className="upload-text">
                <strong>{busy ? 'Uploader...' : 'Klik for at uploade'}</strong>
                {!busy && ' eller træk hertil'}
              </div>
              <div className="upload-sub">.csv eller .xlsx</div>
            </div>
          </FilePicker>
        )}
        {data.csvFile && (
          <FilePicker accept=".csv,.xlsx" disabled={busy} onPick={handleCsv}>
            <span className="upload-add-btn">↑ Udskift fil</span>
          </FilePicker>
        )}
      </div>

      <div className="qgroup">
        <div className="qgroup-head">
          <div className="qgroup-title">Kontraktskabeloner</div>
          <div className="qgroup-hint">
            Upload jeres kontraktskabeloner pr. medarbejdertype. Kontrakter kan kun uploades som Word-filer
            (.doc / .docx). Kontraktens navn i Dully bliver filnavnet, så giv filerne et sigende navn inden
            upload.
          </div>
        </div>
        {contracts.length > 0 && (
          <div className="file-list">
            {contracts.map((f, i) => (
              <div className="file-item" key={`${f}-${i}`}>
                <div className="file-icon">📋</div>
                <div className="file-name">{f}</div>
                <button className="file-remove" onClick={() => removeContract(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <FilePicker accept=".doc,.docx" disabled={busy} onPick={addContract}>
          <span className="upload-add-btn">+ Tilføj kontraktskabelon</span>
        </FilePicker>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6 }}>
          Kun Word-filer (.doc / .docx)
        </div>
      </div>
    </>
  )
}

// ── PAYROLL ────────────────────────────────────────────────────────────
function PayrollSection({
  data,
  onChange,
}: {
  data: PayrollData
  onChange: (d: PayrollData) => void
}) {
  const a: PayrollAnswers = data.answers ?? {}
  const pauseRules = a.pauseRules ?? []
  const wageSups = a.wageSups ?? []
  const shiftTypes = a.shiftTypes ?? []
  const [showPause, setShowPause] = useState(false)
  const [showWage, setShowWage] = useState(false)
  const [showShift, setShowShift] = useState(false)

  const setAnswers = (next: PayrollAnswers) => onChange({ ...data, answers: next })

  return (
    <>
      {/* Lønperiode */}
      <div className="qgroup">
        <div className="qgroup-head">
          <div className="qgroup-title">Lønperiode</div>
          <div className="qgroup-hint">Hvilken dag i måneden starter jeres lønperiode?</div>
        </div>
        <div style={{ maxWidth: 220 }}>
          <div className="qlabel" style={{ marginBottom: 6 }}>
            Vælg startdato
          </div>
          <select
            value={a.loenperiodeFra ?? ''}
            onChange={(e) => setAnswers({ ...a, loenperiodeFra: e.target.value })}
          >
            <option value="">Vælg dag...</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pauseregler */}
      <div className="qgroup">
        <div className="qgroup-head">
          <div className="qgroup-title">Pauseregler</div>
          <div className="qgroup-hint">
            Opsæt automatiske pauseregler. En regel siger: &quot;Når en vagt varer X, trækkes Y i
            pause.&quot; I kan tilføje flere.
          </div>
        </div>
        <div className="builder-list">
          {pauseRules.map((r, i) => (
            <div className="builder-item" key={i}>
              <div className="builder-item-text">
                <div className="builder-item-title">
                  Vagt over {pad(r.shiftH)}:{pad(r.shiftM)}:{pad(r.shiftS)}
                </div>
                <div className="builder-item-sub">
                  Pause: {pad(r.breakH)}:{pad(r.breakM)}:{pad(r.breakS)}
                </div>
              </div>
              <button
                className="builder-remove"
                onClick={() => {
                  const next = pauseRules.slice()
                  next.splice(i, 1)
                  setAnswers({ ...a, pauseRules: next })
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="upload-add-btn" onClick={() => setShowPause((v) => !v)}>
          + Tilføj pauseregel
        </button>
        {showPause && (
          <PauseForm
            onCancel={() => setShowPause(false)}
            onAdd={(rule) => {
              setAnswers({ ...a, pauseRules: [...pauseRules, rule] })
              setShowPause(false)
            }}
          />
        )}
      </div>

      {/* Faste løntillæg */}
      <div className="qgroup">
        <div className="qgroup-head">
          <div className="qgroup-title">Faste løntillæg</div>
          <div className="qgroup-hint">
            Lukke-, tilkalde-, helligdags- eller aften/weekendtillæg. Tilføj et ad gangen.
          </div>
        </div>
        <div className="builder-list">
          {wageSups.map((w, i) => (
            <div className="builder-item" key={i}>
              <div className="builder-item-text">
                <div className="builder-item-title">
                  {w.day}
                  {w.type === 'from_time' ? ` fra ${w.startTime}` : ''}
                </div>
                <div className="builder-item-sub">
                  {w.type === 'all_day' ? 'Hele dagen' : 'Fra bestemt tidspunkt'} · {w.rate} kr.
                </div>
              </div>
              <button
                className="builder-remove"
                onClick={() => {
                  const next = wageSups.slice()
                  next.splice(i, 1)
                  setAnswers({ ...a, wageSups: next })
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="upload-add-btn" onClick={() => setShowWage((v) => !v)}>
          + Tilføj løntillæg
        </button>
        {showWage && (
          <WageForm
            onCancel={() => setShowWage(false)}
            onAdd={(w) => {
              setAnswers({ ...a, wageSups: [...wageSups, w] })
              setShowWage(false)
            }}
          />
        )}
      </div>

      {/* Lønsystem */}
      <div className="qgroup">
        <div className="qgroup-head">
          <div className="qgroup-title">Lønsystem</div>
          <div className="qgroup-hint">Hvilket lønsystem bruger I?</div>
        </div>
        <div style={{ maxWidth: 320 }}>
          <select
            value={a.loensystem ?? ''}
            onChange={(e) => setAnswers({ ...a, loensystem: e.target.value })}
          >
            <option value="">Vælg lønsystem...</option>
            {LOENSYSTEMER.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {a.loensystem === 'Andet' && (
            <input
              type="text"
              placeholder="Hvilket lønsystem bruger I?"
              value={a.loensystemOther ?? ''}
              onChange={(e) => setAnswers({ ...a, loensystemOther: e.target.value })}
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      </div>

      {/* Shift types */}
      <div className="qgroup">
        <div className="qgroup-head">
          <div className="qgroup-title">Shift-typer</div>
          <div className="qgroup-hint">
            Vagttyper med særlig sats eller regel, fx tilkalde- eller administrative vagter. Tilføj en ad
            gangen.
          </div>
        </div>
        <div className="builder-list">
          {shiftTypes.map((st, i) => (
            <div className="builder-item" key={i}>
              <div className="builder-item-text">
                <div className="builder-item-title">{st.title}</div>
                <div className="builder-item-sub">
                  {st.amount} kr. · {st.bonusMode === 'per_hour' ? 'Extra pr. time' : 'Én gang pr. vagt'}
                  {st.description ? ` · ${st.description.slice(0, 40)}${st.description.length > 40 ? '...' : ''}` : ''}
                </div>
              </div>
              <button
                className="builder-remove"
                onClick={() => {
                  const next = shiftTypes.slice()
                  next.splice(i, 1)
                  setAnswers({ ...a, shiftTypes: next })
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="upload-add-btn" onClick={() => setShowShift((v) => !v)}>
          + Tilføj shift-type
        </button>
        {showShift && (
          <ShiftForm
            onCancel={() => setShowShift(false)}
            onAdd={(st) => {
              setAnswers({ ...a, shiftTypes: [...shiftTypes, st] })
              setShowShift(false)
            }}
          />
        )}
      </div>
    </>
  )
}

function PauseForm({ onAdd, onCancel }: { onAdd: (r: PauseRule) => void; onCancel: () => void }) {
  const [v, setV] = useState({ shiftH: 0, shiftM: 0, shiftS: 0, breakH: 0, breakM: 0, breakS: 0 })
  const num = (k: keyof typeof v) => (
    <div className="time-col">
      <input
        className="time-num"
        type="number"
        min={0}
        value={v[k]}
        onChange={(e) => setV({ ...v, [k]: Number(e.target.value) || 0 })}
      />
      <div className="time-lbl">{k.endsWith('H') ? 'Timer' : k.endsWith('M') ? 'Min' : 'Sek'}</div>
    </div>
  )
  return (
    <div className="add-form">
      <div className="add-form-title">Ny pauseregel</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div>
          <div className="time-group-label">Varighed af vagt</div>
          <div className="time-picker">
            {num('shiftH')}
            <div className="time-sep">:</div>
            {num('shiftM')}
            <div className="time-sep">:</div>
            {num('shiftS')}
          </div>
        </div>
        <div className="time-eq">=</div>
        <div>
          <div className="time-group-label">Pause</div>
          <div className="time-picker">
            {num('breakH')}
            <div className="time-sep">:</div>
            {num('breakM')}
            <div className="time-sep">:</div>
            {num('breakS')}
          </div>
        </div>
      </div>
      <div className="add-form-actions">
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>
          Annuller
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (v.shiftH === 0 && v.shiftM === 0 && v.shiftS === 0) return
            onAdd(v)
          }}
        >
          Tilføj pauseregel
        </button>
      </div>
    </div>
  )
}

function WageForm({ onAdd, onCancel }: { onAdd: (w: WageSup) => void; onCancel: () => void }) {
  const [type, setType] = useState<'all_day' | 'from_time'>('all_day')
  const [day, setDay] = useState('')
  const [startTime, setStartTime] = useState('')
  const [rate, setRate] = useState(0)
  return (
    <div className="add-form">
      <div className="add-form-title">Nyt løntillæg</div>
      <div className="qblock" style={{ marginBottom: 14 }}>
        <div className="qlabel" style={{ fontSize: 13 }}>
          Type
        </div>
        <div className="toggle-group" style={{ marginTop: 6 }}>
          <button
            className={`toggle-btn${type === 'all_day' ? ' active' : ''}`}
            onClick={() => setType('all_day')}
          >
            Hele dagen
          </button>
          <button
            className={`toggle-btn${type === 'from_time' ? ' active' : ''}`}
            onClick={() => setType('from_time')}
          >
            Fra bestemt tidspunkt
          </button>
        </div>
      </div>
      <div className="add-form-row">
        <div>
          <div className="qlabel" style={{ fontSize: 13, marginBottom: 6 }}>
            Ugedag
          </div>
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">Vælg dag...</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        {type === 'from_time' && (
          <div>
            <div className="qlabel" style={{ fontSize: 13, marginBottom: 6 }}>
              Fra tidspunkt
            </div>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
        )}
      </div>
      <div>
        <div className="qlabel" style={{ fontSize: 13, marginBottom: 6 }}>
          Sats (kr.)
        </div>
        <input
          type="number"
          min={0}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value) || 0)}
          style={{ width: 160 }}
        />
      </div>
      <div className="add-form-actions">
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>
          Annuller
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (!day) return
            onAdd({ type, day, startTime: type === 'from_time' ? startTime : '', rate })
          }}
        >
          Tilføj tillæg
        </button>
      </div>
    </div>
  )
}

function ShiftForm({ onAdd, onCancel }: { onAdd: (s: ShiftType) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)
  const [bonusMode, setBonusMode] = useState<'' | 'per_hour' | 'one_time'>('')
  return (
    <div className="add-form">
      <div className="add-form-title">Ny shift-type</div>
      <div className="qblock" style={{ marginBottom: 14 }}>
        <div className="qlabel" style={{ fontSize: 13, marginBottom: 6 }}>
          Navn
        </div>
        <input type="text" placeholder="fx Tilkaldevagt" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="qblock" style={{ marginBottom: 14 }}>
        <div className="qlabel" style={{ fontSize: 13, marginBottom: 6 }}>
          Beskrivelse
        </div>
        <textarea
          placeholder="Beskriv vagttypens formål..."
          style={{ minHeight: 72 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="qblock" style={{ marginBottom: 14 }}>
        <div className="qlabel" style={{ fontSize: 13, marginBottom: 6 }}>
          Beløb (kr.)
        </div>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          style={{ width: 160 }}
        />
      </div>
      <div className="qblock" style={{ marginBottom: 0 }}>
        <div className="qlabel" style={{ fontSize: 13, marginBottom: 8 }}>
          Bonustype
        </div>
        <div className="radio-group">
          <label className={`radio-opt${bonusMode === 'per_hour' ? ' selected' : ''}`} onClick={() => setBonusMode('per_hour')}>
            <input type="radio" name="bonusMode" value="per_hour" checked={bonusMode === 'per_hour'} readOnly />
            <div className="radio-opt-text">
              <div className="radio-opt-label">Extra pr. time</div>
              <div className="radio-opt-sub">Tillægget lægges til per time arbejdet.</div>
            </div>
          </label>
          <label className={`radio-opt${bonusMode === 'one_time' ? ' selected' : ''}`} onClick={() => setBonusMode('one_time')}>
            <input type="radio" name="bonusMode" value="one_time" checked={bonusMode === 'one_time'} readOnly />
            <div className="radio-opt-text">
              <div className="radio-opt-label">Én gang pr. vagt</div>
              <div className="radio-opt-sub">Tillægget gives én gang uanset vagtlængden.</div>
            </div>
          </label>
        </div>
      </div>
      <div className="add-form-actions">
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>
          Annuller
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (!title.trim() || !bonusMode) return
            onAdd({ title: title.trim(), description: description.trim(), amount, bonusMode })
          }}
        >
          Tilføj shift-type
        </button>
      </div>
    </div>
  )
}

// ── BUDGET ─────────────────────────────────────────────────────────────
function BudgetSection({
  data,
  upload,
  onChange,
}: {
  data: BudgetData
  upload: (section: string, field: string, file: File) => Promise<string>
  onChange: (d: BudgetData) => void
}) {
  const [busy, setBusy] = useState(false)
  const handle = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const name = await upload('budget', 'budgetFile', file)
      onChange({ ...data, budgetFile: name })
    } catch {
      alert('Upload fejlede. Prøv igen.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="qgroup">
        <div className="qgroup-head">
          <div className="qgroup-title">Budget-fil</div>
          <div className="qgroup-hint">
            Upload jeres omsætningsbudget. Vi sætter det op pr. afdeling i Dully.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={downloadBudgetTemplate}>
            ↓ Download budget-skabelon
          </button>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Udfyld og upload nedenfor</span>
        </div>
        {data.budgetFile ? (
          <>
            <div className="file-list">
              <div className="file-item">
                <div className="file-icon">📊</div>
                <div className="file-name">{data.budgetFile}</div>
                <button className="file-remove" onClick={() => onChange({ ...data, budgetFile: null })}>
                  ×
                </button>
              </div>
            </div>
            <FilePicker accept=".xlsx,.csv,.xls" disabled={busy} onPick={handle}>
              <span className="upload-add-btn">↑ Udskift fil</span>
            </FilePicker>
          </>
        ) : (
          <FilePicker accept=".xlsx,.csv,.xls" disabled={busy} onPick={handle}>
            <div className="upload-area">
              <div className="upload-icon">📊</div>
              <div className="upload-text">
                <strong>{busy ? 'Uploader...' : 'Klik for at uploade'}</strong>
                {!busy && ' jeres budget'}
              </div>
              <div className="upload-sub">.xlsx eller .csv</div>
            </div>
          </FilePicker>
        )}
      </div>
      <div className="qgroup">
        <div className="qgroup-head">
          <div className="qgroup-title">Kommentar til budgettet</div>
          <div className="qgroup-hint">Særlige perioder, lukkedage, eller noget vi bør vide?</div>
        </div>
        <textarea
          placeholder="Fx: Vi holder lukket hele januar..."
          defaultValue={data.answers?.budgetNotes ?? ''}
          onBlur={(e) => onChange({ ...data, answers: { budgetNotes: e.target.value } })}
        />
      </div>
    </>
  )
}

// ── INVENTORY ──────────────────────────────────────────────────────────
function InventorySection({
  data,
  upload,
  onChange,
}: {
  data: InventoryData
  upload: (section: string, field: string, file: File) => Promise<string>
  onChange: (d: InventoryData) => void
}) {
  const [busy, setBusy] = useState(false)
  const handle = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const name = await upload('inventory', 'inventoryFile', file)
      onChange({ ...data, inventoryFile: name })
    } catch {
      alert('Upload fejlede. Prøv igen.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="qgroup">
        <div className="qgroup-head">
          <div className="qgroup-title">Leverandørliste</div>
          <div className="qgroup-hint">
            Upload en oversigt over jeres leverandører. Vi importerer dem ind i Dully.
          </div>
        </div>
        {data.inventoryFile ? (
          <>
            <div className="file-list">
              <div className="file-item">
                <div className="file-icon">🗂️</div>
                <div className="file-name">{data.inventoryFile}</div>
                <button className="file-remove" onClick={() => onChange({ ...data, inventoryFile: null })}>
                  ×
                </button>
              </div>
            </div>
            <FilePicker accept=".xlsx,.csv,.xls" disabled={busy} onPick={handle}>
              <span className="upload-add-btn">↑ Udskift fil</span>
            </FilePicker>
          </>
        ) : (
          <FilePicker accept=".xlsx,.csv,.xls" disabled={busy} onPick={handle}>
            <div className="upload-area">
              <div className="upload-icon">🗂️</div>
              <div className="upload-text">
                <strong>{busy ? 'Uploader...' : 'Klik for at uploade'}</strong>
                {!busy && ' leverandørliste'}
              </div>
              <div className="upload-sub">.xlsx eller .csv</div>
            </div>
          </FilePicker>
        )}
      </div>
      <div className="qgroup">
        <div className="qgroup-head">
          <div className="qgroup-title">Noter til leverandørlisten</div>
          <div className="qgroup-hint">Særlige aftaler, faste leveringsdage, eller andet vi bør vide?</div>
        </div>
        <textarea
          placeholder="Fx: Leverandør X leverer kun mandag og torsdag..."
          defaultValue={data.answers?.inventoryNotes ?? ''}
          onBlur={(e) => onChange({ ...data, answers: { inventoryNotes: e.target.value } })}
        />
      </div>
    </>
  )
}

// ── INTEGRATIONS ───────────────────────────────────────────────────────
function IntegrationsSection({
  section,
  data,
  onChange,
}: {
  section: SectionConfig
  data: IntegrationsData
  onChange: (d: IntegrationsData) => void
}) {
  const answers = data.answers ?? {}
  return (
    <>
      {(section.questions ?? []).map((q) => (
        <div className="qgroup" key={q.id}>
          <div className="qgroup-head">
            <div className="qgroup-title">{q.label}</div>
            <div className="qgroup-hint">{q.hint}</div>
          </div>
          <textarea
            placeholder="Jeres svar..."
            defaultValue={answers[q.id] ?? ''}
            onBlur={(e) => onChange({ ...data, answers: { ...answers, [q.id]: e.target.value } })}
          />
        </div>
      ))}
    </>
  )
}

// ── SHARED ─────────────────────────────────────────────────────────────
function FilePicker({
  accept,
  disabled,
  onPick,
  children,
}: {
  accept: string
  disabled?: boolean
  onPick: (file: File | undefined) => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <span
      onClick={() => !disabled && ref.current?.click()}
      style={{ cursor: disabled ? 'default' : 'pointer', display: 'block' }}
    >
      {children}
      <input
        ref={ref}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          onPick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </span>
  )
}

function downloadCSV() {
  const headers = [
    'Fornavn', 'Efternavn', 'E-mail', 'Afdeling', 'Stilling / rolle', 'Løntype', 'Sats', 'Sats-enhed',
    'Timer/uge', 'Ansættelsesdato', 'Kontraktskabelon', 'Noter',
  ]
  const example = [
    'Anne', 'Hansen', 'anne@eksempel.dk', '[Afdeling 1]', 'Barista', 'Timeløn', '145', 'kr./time', '25',
    '2026-06-20', 'Timelønnet std.', 'Eksempel: slet eller overskriv',
  ]
  const csv = [headers.join(','), example.map((v) => `"${v}"`).join(',')].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = 'dully-medarbejdere-skabelon.csv'
  a.click()
}

function downloadBudgetTemplate() {
  const headers = ['Afdeling', 'Måned', 'Omsætningsbudget inkl. moms (kr.)', 'Noter']
  const example = ['[Afdeling 1]', '2026-07', '450000', 'Eksempel: slet eller overskriv']
  const csv = [headers.join(','), example.map((v) => `"${v}"`).join(',')].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
  a.download = 'dully-budget-skabelon.csv'
  a.click()
}
