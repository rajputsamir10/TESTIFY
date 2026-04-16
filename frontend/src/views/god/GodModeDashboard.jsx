"use client"

import {
  Activity,
  AlertTriangle,
  Bell,
  Bug,
  CheckCircle2,
  Database,
  Download,
  FileText,
  Gauge,
  PlayCircle,
  RefreshCw,
  Send,
  Settings,
  Shield,
  ToggleLeft,
  Users,
  XCircle,
} from 'lucide-react'
import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { godAPI } from '../../api/godAPI'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuth } from '../../context/AuthContext'
import { getErrorMessage } from '../../utils/errors'
import './GodModeDashboard.css'

const SECTION_LINKS = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'exam-sim', label: 'Exam Simulator', icon: PlayCircle },
  { id: 'anti-cheat', label: 'Anti-Cheat', icon: AlertTriangle },
  { id: 'role-tester', label: 'Role Access', icon: Users },
  { id: 'api-monitor', label: 'API Monitor', icon: Activity },
  { id: 'db-inspector', label: 'Database Inspector', icon: Database },
  { id: 'toggles', label: 'Feature Toggles', icon: ToggleLeft },
  { id: 'logs', label: 'Activity Logs', icon: FileText },
  { id: 'stress', label: 'Stress Testing', icon: Gauge },
  { id: 'bugs', label: 'Bug Reporter', icon: Bug },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

const EXAM_ACTION_OPTIONS = [
  { value: 'start', label: 'Start Simulated Exam' },
  { value: 'simulate_student_answer', label: 'Simulate Student Answer' },
  { value: 'force_timer_end', label: 'Force Timer End' },
  { value: 'force_submit', label: 'Force Submit' },
]

const ANTI_CHEAT_TRIGGERS = [
  'tab_switch',
  'browser_minimize',
  'fullscreen_exit',
  'camera_off',
  'face_not_detected',
  'multiple_faces',
  'no_person_in_frame',
  'mic_muted',
  'network_disconnect',
  'right_click',
  'copy_attempt',
  'paste_attempt',
  'keyboard_shortcut',
  'devtools_open',
]

const STRESS_SCENARIOS = [
  { value: 'users_10', label: '10 Users' },
  { value: 'users_100', label: '100 Users' },
  { value: 'requests_1000', label: '1000 Requests' },
  { value: 'concurrent_submissions', label: 'Concurrent Submissions' },
  { value: 'result_generation_load', label: 'Result Generation Load' },
]

const BUG_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
]

const DEFAULT_SETTINGS = {
  theme: 'system',
  auto_refresh_interval: 30,
  log_retention_days: 30,
  notification_sound: true,
}

function formatDate(dateLike) {
  if (!dateLike) return 'N/A'
  const date = new Date(dateLike)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString()
}

function levelTone(level) {
  const lowered = String(level || '').toLowerCase()
  if (lowered === 'success') return 'success'
  if (lowered === 'warning') return 'warning'
  if (lowered === 'error') return 'error'
  return 'info'
}

function SectionPanel({ id, title, subtitle, icon, children, actions }) {
  const iconNode = icon ? createElement(icon, { size: 16 }) : null

  return (
    <section id={id} className="god-mode-section-panel">
      <header className="god-mode-panel-header">
        <div className="god-mode-panel-title-wrap">
          <span className="god-mode-panel-icon-wrap">
            {iconNode}
          </span>
          <div>
            <h2 className="god-mode-panel-title">{title}</h2>
            <p className="god-mode-panel-subtitle">{subtitle}</p>
          </div>
        </div>
        {actions ? <div className="god-mode-panel-actions">{actions}</div> : null}
      </header>
      <div className="god-mode-panel-body">{children}</div>
    </section>
  )
}

function MetricCard({ label, value, hint }) {
  return (
    <article className="god-mode-metric-card">
      <p className="god-mode-metric-label">{label}</p>
      <p className="god-mode-metric-value">{value}</p>
      {hint ? <p className="god-mode-metric-hint">{hint}</p> : null}
    </article>
  )
}

function GodModeDashboard() {
  const router = useRouter()
  const { user } = useAuth()

  const [bootLoading, setBootLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [moduleBusy, setModuleBusy] = useState({})

  const [overview, setOverview] = useState(null)
  const [toggles, setToggles] = useState([])
  const [logs, setLogs] = useState([])
  const [apiReport, setApiReport] = useState(null)
  const [databaseReport, setDatabaseReport] = useState(null)
  const [stressResult, setStressResult] = useState(null)
  const [antiCheatResult, setAntiCheatResult] = useState(null)
  const [rolePreview, setRolePreview] = useState(null)
  const [examResult, setExamResult] = useState(null)
  const [notificationResult, setNotificationResult] = useState(null)
  const [bugReports, setBugReports] = useState([])

  const [settingsRows, setSettingsRows] = useState([])
  const [settingsModel, setSettingsModel] = useState(DEFAULT_SETTINGS)

  const [examForm, setExamForm] = useState({
    action: 'start',
    duration_minutes: 30,
    question_count: 20,
    subject: 'General Aptitude',
    mode: 'mixed',
  })

  const [antiCheatForm, setAntiCheatForm] = useState({ trigger: 'tab_switch' })
  const [roleForm, setRoleForm] = useState({ role: 'developer' })
  const [logFilters, setLogFilters] = useState({ module: '', level: '', limit: 120 })
  const [newLogForm, setNewLogForm] = useState({ module: 'dashboard', level: 'info', message: '', details: '{}' })
  const [stressForm, setStressForm] = useState({ scenario: 'users_100' })
  const [bugForm, setBugForm] = useState({ title: '', module: 'exam_simulator', severity: 'medium', steps_to_reproduce: '' })
  const [bugDrafts, setBugDrafts] = useState({})
  const [notificationForm, setNotificationForm] = useState({ target_role: 'all', message: '' })

  const roleHome = useMemo(() => {
    if (user?.role === 'god') return '/god'
    if (user?.role === 'admin') return '/admin'
    if (user?.role === 'teacher') return '/teacher'
    if (user?.role === 'student') return '/student'
    return '/'
  }, [user?.role])

  const accessMode = overview?.access?.mode || 'full'
  const canWrite = overview?.access?.can_write !== false

  const setBusy = useCallback((key, isBusy) => {
    setModuleBusy((prev) => ({ ...prev, [key]: isBusy }))
  }, [])

  const handleApiFailure = useCallback((error, fallback) => {
    if (error?.response?.status === 403) {
      setForbidden(true)
      return true
    }
    toast.error(getErrorMessage(error, fallback))
    return false
  }, [])

  const hydrateSettings = useCallback((rows) => {
    const merged = { ...DEFAULT_SETTINGS }
    ;(Array.isArray(rows) ? rows : []).forEach((entry) => {
      merged[entry.key] = entry.value
    })
    setSettingsRows(Array.isArray(rows) ? rows : [])
    setSettingsModel({
      theme: merged.theme,
      auto_refresh_interval: Number(merged.auto_refresh_interval ?? 30),
      log_retention_days: Number(merged.log_retention_days ?? 30),
      notification_sound: Boolean(merged.notification_sound),
    })
  }, [])

  const loadOverview = useCallback(async () => {
    const { data } = await godAPI.getGodModeOverview()
    setOverview(data)
  }, [])

  const loadToggles = useCallback(async () => {
    const { data } = await godAPI.listGodModeToggles()
    setToggles(Array.isArray(data) ? data : [])
  }, [])

  const loadSettings = useCallback(async () => {
    const { data } = await godAPI.listGodModeSettings()
    hydrateSettings(data)
  }, [hydrateSettings])

  const loadLogs = useCallback(async (filters) => {
    const payload = {
      module: filters?.module || undefined,
      level: filters?.level || undefined,
      limit: filters?.limit || 120,
    }
    const { data } = await godAPI.listGodModeLogs(payload)
    setLogs(Array.isArray(data) ? data : [])
  }, [])

  const loadBugReports = useCallback(async () => {
    const { data } = await godAPI.listGodModeBugReports()
    setBugReports(Array.isArray(data) ? data : [])
  }, [])

  const bootstrap = useCallback(async () => {
    setBootLoading(true)
    setForbidden(false)
    try {
      await Promise.all([
        loadOverview(),
        loadToggles(),
        loadSettings(),
        loadLogs(logFilters),
        loadBugReports(),
      ])
    } catch (error) {
      const denied = handleApiFailure(error, 'Unable to initialize God Mode dashboard')
      if (!denied) {
        setOverview(null)
      }
    } finally {
      setBootLoading(false)
    }
  }, [handleApiFailure, loadBugReports, loadLogs, loadOverview, loadSettings, loadToggles, logFilters])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  const refreshModule = async (key, task, fallbackMessage) => {
    setBusy(key, true)
    try {
      await task()
    } catch (error) {
      handleApiFailure(error, fallbackMessage)
    } finally {
      setBusy(key, false)
    }
  }

  const assertWritable = () => {
    if (canWrite) {
      return true
    }
    toast.info('Read-only God Mode access: write actions are disabled.')
    return false
  }

  const runExamSimulation = async () => {
    if (!assertWritable()) return

    await refreshModule(
      'exam',
      async () => {
        const payload = {
          ...examForm,
          duration_minutes: Number(examForm.duration_minutes),
          question_count: Number(examForm.question_count),
        }
        const { data } = await godAPI.simulateExamAction(payload)
        setExamResult(data)
        toast.success('Exam simulation action completed')
        await Promise.all([loadOverview(), loadLogs(logFilters)])
      },
      'Exam simulation failed',
    )
  }

  const runAntiCheatSimulation = async () => {
    if (!assertWritable()) return

    await refreshModule(
      'antiCheat',
      async () => {
        const { data } = await godAPI.simulateAntiCheat(antiCheatForm)
        setAntiCheatResult(data)
        toast.success('Anti-cheat trigger simulated')
        await Promise.all([loadOverview(), loadLogs(logFilters)])
      },
      'Unable to run anti-cheat simulation',
    )
  }

  const runRoleSimulation = async () => {
    await refreshModule(
      'role',
      async () => {
        const { data } = await godAPI.simulateRoleAccess(roleForm)
        setRolePreview(data)
        toast.success('Role access preview generated')
        await loadLogs(logFilters)
      },
      'Role simulation failed',
    )
  }

  const runApiMonitor = async (runFullSuite = true) => {
    await refreshModule(
      'apiMonitor',
      async () => {
        const { data } = await godAPI.runApiMonitor({ run_full_suite: runFullSuite })
        setApiReport(data)
        toast.success(runFullSuite ? 'API monitor suite executed' : 'Loaded cached API monitor report')
        await Promise.all([loadOverview(), loadLogs(logFilters)])
      },
      'Unable to run API monitor',
    )
  }

  const loadDatabaseInspector = async () => {
    await refreshModule(
      'database',
      async () => {
        const { data } = await godAPI.getDatabaseInspector()
        setDatabaseReport(data)
        await loadLogs(logFilters)
      },
      'Unable to load database inspector',
    )
  }

  const updateToggle = async (toggleKey, nextValue) => {
    if (!assertWritable()) return

    await refreshModule(
      `toggle-${toggleKey}`,
      async () => {
        await godAPI.patchGodModeToggle(toggleKey, nextValue)
        toast.success(`Toggle '${toggleKey}' updated`)
        await Promise.all([loadToggles(), loadOverview(), loadLogs(logFilters)])
      },
      'Failed to update toggle',
    )
  }

  const fetchFilteredLogs = async () => {
    await refreshModule(
      'logs',
      async () => {
        await loadLogs(logFilters)
      },
      'Unable to load activity logs',
    )
  }

  const createManualLog = async () => {
    if (!assertWritable()) return

    await refreshModule(
      'logsCreate',
      async () => {
        let parsedDetails = {}
        if (newLogForm.details.trim()) {
          try {
            parsedDetails = JSON.parse(newLogForm.details)
          } catch {
            toast.error('Details must be valid JSON')
            return
          }
        }

        await godAPI.createGodModeLog({
          module: newLogForm.module,
          level: newLogForm.level,
          message: newLogForm.message,
          details: parsedDetails,
        })
        setNewLogForm((prev) => ({ ...prev, message: '', details: '{}' }))
        toast.success('Manual log entry added')
        await fetchFilteredLogs()
      },
      'Could not create log entry',
    )
  }

  const exportLogsCsv = async () => {
    await refreshModule(
      'logsExport',
      async () => {
        const response = await godAPI.exportGodModeLogs({
          module: logFilters.module || undefined,
          level: logFilters.level || undefined,
          limit: logFilters.limit || 500,
        })
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
        const url = window.URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'god_mode_logs.csv'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.URL.revokeObjectURL(url)
        toast.success('Logs CSV downloaded')
      },
      'Unable to export logs',
    )
  }

  const runStressSimulation = async () => {
    if (!assertWritable()) return

    await refreshModule(
      'stress',
      async () => {
        const { data } = await godAPI.runStressTest(stressForm)
        setStressResult(data)
        toast.success('Stress test simulation complete')
        await Promise.all([loadOverview(), loadLogs(logFilters)])
      },
      'Stress test failed',
    )
  }

  const createBugReport = async () => {
    await refreshModule(
      'bugsCreate',
      async () => {
        await godAPI.createGodModeBugReport(bugForm)
        setBugForm({ title: '', module: 'exam_simulator', severity: 'medium', steps_to_reproduce: '' })
        toast.success('Bug report submitted')
        await Promise.all([loadBugReports(), loadLogs(logFilters), loadOverview()])
      },
      'Unable to submit bug report',
    )
  }

  const updateBugDraft = (bugId, patch) => {
    setBugDrafts((prev) => ({
      ...prev,
      [bugId]: {
        ...(prev[bugId] || {}),
        ...patch,
      },
    }))
  }

  const patchBugReport = async (bug) => {
    if (!assertWritable()) return

    const draft = bugDrafts[bug.id] || {}
    const nextStatus = draft.status ?? bug.status
    const nextAssignee = draft.assigned_to ?? bug.assigned_to ?? ''

    const payload = {}
    if (nextStatus !== bug.status) payload.status = nextStatus
    if (nextAssignee !== (bug.assigned_to || '')) payload.assigned_to = nextAssignee || null

    if (Object.keys(payload).length === 0) {
      toast.info('No bug report changes to apply')
      return
    }

    await refreshModule(
      `bugPatch-${bug.id}`,
      async () => {
        await godAPI.patchGodModeBugReport(bug.id, payload)
        toast.success('Bug report updated')
        await Promise.all([loadBugReports(), loadLogs(logFilters), loadOverview()])
      },
      'Unable to update bug report',
    )
  }

  const saveSettings = async () => {
    if (!assertWritable()) return

    await refreshModule(
      'settings',
      async () => {
        await godAPI.patchGodModeSettings({
          theme: settingsModel.theme,
          auto_refresh_interval: Number(settingsModel.auto_refresh_interval),
          log_retention_days: Number(settingsModel.log_retention_days),
          notification_sound: Boolean(settingsModel.notification_sound),
        })
        toast.success('God Mode settings saved')
        await Promise.all([loadSettings(), loadLogs(logFilters)])
      },
      'Failed to save settings',
    )
  }

  const safeModeReset = async () => {
    if (!assertWritable()) return

    await refreshModule(
      'safeReset',
      async () => {
        await godAPI.patchGodModeSettings({ safe_mode_reset: true })
        toast.success('Safe mode reset applied')
        await Promise.all([loadToggles(), loadSettings(), loadOverview(), loadLogs(logFilters)])
      },
      'Safe mode reset failed',
    )
  }

  const runNotificationSimulation = async () => {
    if (!assertWritable()) return

    await refreshModule(
      'notifications',
      async () => {
        const { data } = await godAPI.simulateGodModeNotification(notificationForm)
        setNotificationResult(data)
        toast.success('Notification simulation completed')
        await Promise.all([loadOverview(), loadLogs(logFilters)])
      },
      'Notification simulation failed',
    )
  }

  if (bootLoading) {
    return <LoadingSpinner text="Bootstrapping God Mode dashboard" />
  }

  if (forbidden) {
    return (
      <div className="god-mode-root">
        <div className="god-mode-access-denied">
          <AlertTriangle size={20} className="text-[#f97316]" />
          <h1>Access Restricted</h1>
          <p>
            Only super admin accounts, allowlisted developer emails, and authorized tester emails can open this panel.
          </p>
          <button type="button" className="god-mode-btn god-mode-btn-primary" onClick={() => router.push(roleHome)}>
            Return to Workspace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="god-mode-root">
      <header className="god-mode-hero">
        <div>
          <p className="god-mode-kicker">Internal Reliability Console</p>
          <h1>GOD MODE: Feature Testing & Simulation Dashboard</h1>
          <p>
            Centralized QA command center for simulation, diagnostics, anti-cheat validation, stress profiling, and
            release confidence checks.
          </p>
        </div>
        <div className="god-mode-hero-actions">
          <button
            type="button"
            className="god-mode-btn"
            disabled={Boolean(moduleBusy.globalRefresh)}
            onClick={() => refreshModule('globalRefresh', bootstrap, 'Failed to refresh dashboard')}
          >
            <RefreshCw size={15} /> Refresh All
          </button>
          <button type="button" className="god-mode-btn god-mode-btn-primary" onClick={() => router.push(roleHome)}>
            Back to Workspace
          </button>
        </div>
      </header>

      <nav className="god-mode-nav-strip" aria-label="God Mode Sections">
        {SECTION_LINKS.map((item) => {
          return (
            <a key={item.id} href={`#${item.id}`} className="god-mode-nav-link">
              {createElement(item.icon, { size: 14 })}
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>

      <section id="overview" className="god-mode-overview-grid">
        <MetricCard label="Organizations" value={overview?.platform?.organizations_total ?? 0} />
        <MetricCard label="Users" value={overview?.platform?.users_total ?? 0} hint="Across all roles" />
        <MetricCard label="Active Exams" value={overview?.live_exam_status?.active_exams ?? 0} />
        <MetricCard label="Ongoing Attempts" value={overview?.live_exam_status?.ongoing_attempts ?? 0} />
        <MetricCard label="Suspicious Attempts" value={overview?.live_exam_status?.suspicious_attempts ?? 0} />
        <MetricCard label="Open Bugs" value={overview?.health?.open_bug_reports ?? 0} />
      </section>

      {!canWrite ? (
        <section className="god-mode-access-note">
          Read-only mode is active for this account. Monitoring and reporting are enabled, but simulation controls and
          configuration updates are locked.
        </section>
      ) : null}

      <div className="god-mode-section-grid">
        <SectionPanel id="exam-sim" title="Exam Simulation Module" subtitle="Run controlled exam lifecycle actions" icon={PlayCircle}>
          <div className="god-mode-form-grid god-mode-form-grid-2">
            <label>
              Action
              <select value={examForm.action} onChange={(event) => setExamForm((prev) => ({ ...prev, action: event.target.value }))}>
                {EXAM_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mode
              <select value={examForm.mode} onChange={(event) => setExamForm((prev) => ({ ...prev, mode: event.target.value }))}>
                <option value="mixed">Mixed</option>
                <option value="mcq">MCQ</option>
                <option value="coding">Coding</option>
              </select>
            </label>
            <label>
              Duration (minutes)
              <input
                type="number"
                min="1"
                max="240"
                value={examForm.duration_minutes}
                onChange={(event) => setExamForm((prev) => ({ ...prev, duration_minutes: event.target.value }))}
              />
            </label>
            <label>
              Question Count
              <input
                type="number"
                min="1"
                max="200"
                value={examForm.question_count}
                onChange={(event) => setExamForm((prev) => ({ ...prev, question_count: event.target.value }))}
              />
            </label>
            <label className="god-mode-col-span-2">
              Subject
              <input
                type="text"
                value={examForm.subject}
                onChange={(event) => setExamForm((prev) => ({ ...prev, subject: event.target.value }))}
              />
            </label>
          </div>
          <div className="god-mode-row-actions">
            <button
              type="button"
              className="god-mode-btn god-mode-btn-primary"
              disabled={Boolean(moduleBusy.exam) || !canWrite}
              onClick={runExamSimulation}
            >
              <PlayCircle size={14} /> Execute
            </button>
          </div>
          {examResult ? (
            <div className="god-mode-result-card">
              <p className="god-mode-result-title">Latest Simulation Result</p>
              <p>{examResult.message}</p>
              <pre>{JSON.stringify(examResult.state, null, 2)}</pre>
            </div>
          ) : null}
        </SectionPanel>

        <SectionPanel id="anti-cheat" title="Anti-Cheat Tester" subtitle="Trigger virtual anti-cheat signals" icon={AlertTriangle}>
          <div className="god-mode-form-grid">
            <label>
              Trigger
              <select value={antiCheatForm.trigger} onChange={(event) => setAntiCheatForm({ trigger: event.target.value })}>
                {ANTI_CHEAT_TRIGGERS.map((trigger) => (
                  <option key={trigger} value={trigger}>
                    {trigger}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="god-mode-row-actions">
            <button
              type="button"
              className="god-mode-btn god-mode-btn-primary"
              disabled={Boolean(moduleBusy.antiCheat) || !canWrite}
              onClick={runAntiCheatSimulation}
            >
              <AlertTriangle size={14} /> Trigger Event
            </button>
          </div>
          {antiCheatResult ? (
            <div className="god-mode-result-card">
              <p className="god-mode-result-title">Detection Output</p>
              <p>
                <strong>Status:</strong> {antiCheatResult.status} | <strong>Severity:</strong> {antiCheatResult.severity}
              </p>
              <p>{antiCheatResult.suggested_action}</p>
            </div>
          ) : null}
        </SectionPanel>

        <SectionPanel id="role-tester" title="Role Access Simulator" subtitle="Preview feature visibility by role" icon={Users}>
          <div className="god-mode-form-grid">
            <label>
              Role
              <select value={roleForm.role} onChange={(event) => setRoleForm({ role: event.target.value })}>
                <option value="god">god</option>
                <option value="developer">developer</option>
                <option value="admin">admin</option>
                <option value="teacher">teacher</option>
                <option value="student">student</option>
                <option value="guest">guest</option>
              </select>
            </label>
          </div>
          <div className="god-mode-row-actions">
            <button type="button" className="god-mode-btn god-mode-btn-primary" disabled={Boolean(moduleBusy.role)} onClick={runRoleSimulation}>
              <Users size={14} /> Simulate Access
            </button>
          </div>
          {rolePreview ? (
            <div className="god-mode-split-list">
              <div>
                <p className="god-mode-result-title">Allowed Modules</p>
                <ul>
                  {rolePreview.allowed_modules?.map((moduleName) => (
                    <li key={moduleName}>{moduleName}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="god-mode-result-title">Blocked Modules</p>
                <ul>
                  {rolePreview.blocked_modules?.map((moduleName) => (
                    <li key={moduleName}>{moduleName}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </SectionPanel>

        <SectionPanel
          id="api-monitor"
          title="API Endpoint Monitor"
          subtitle="Run endpoint health probes with timing"
          icon={Activity}
          actions={(
            <>
              <button type="button" className="god-mode-btn" disabled={Boolean(moduleBusy.apiMonitor)} onClick={() => runApiMonitor(false)}>
                Cached
              </button>
              <button
                type="button"
                className="god-mode-btn god-mode-btn-primary"
                disabled={Boolean(moduleBusy.apiMonitor)}
                onClick={() => runApiMonitor(true)}
              >
                Run Suite
              </button>
            </>
          )}
        >
          {!apiReport ? (
            <p className="god-mode-muted">No API report yet. Run a suite to populate endpoint health details.</p>
          ) : (
            <>
              <div className="god-mode-kpi-strip">
                <span>Total: {apiReport.summary?.total ?? 0}</span>
                <span>Success: {apiReport.summary?.success ?? 0}</span>
                <span>Failure: {apiReport.summary?.failure ?? 0}</span>
                <span>Avg: {apiReport.summary?.average_response_time_ms ?? 0} ms</span>
              </div>
              <div className="god-mode-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Status</th>
                      <th>Response</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(apiReport.checks || []).map((check) => (
                      <tr key={check.name}>
                        <td>{check.name}</td>
                        <td>
                          <span className={`god-mode-level-pill tone-${levelTone(check.status === 'success' ? 'success' : 'error')}`}>
                            {check.status}
                          </span>
                        </td>
                        <td>{check.response_time_ms} ms</td>
                        <td>{check.error || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionPanel>

        <SectionPanel
          id="db-inspector"
          title="Database Inspector"
          subtitle="Inspect core table volumes and backup metadata"
          icon={Database}
          actions={(
            <button
              type="button"
              className="god-mode-btn god-mode-btn-primary"
              disabled={Boolean(moduleBusy.database)}
              onClick={loadDatabaseInspector}
            >
              <RefreshCw size={14} /> Inspect
            </button>
          )}
        >
          {!databaseReport ? (
            <p className="god-mode-muted">Load inspector report to view table counts and database size.</p>
          ) : (
            <>
              <div className="god-mode-kpi-strip">
                <span>Tables: {databaseReport.table_count}</span>
                <span>Size: {databaseReport.size?.megabytes ?? 'N/A'} MB</span>
                <span>Last backup: {databaseReport.backup?.last_backup_at || 'Unknown'}</span>
                <span>Status: {databaseReport.backup?.last_backup_status || 'Unknown'}</span>
              </div>
              <div className="god-mode-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Rows</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(databaseReport.core_model_counts || []).map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{row.rows}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionPanel>

        <SectionPanel id="toggles" title="Feature Toggles" subtitle="Runtime switches for testing and failure simulation" icon={ToggleLeft}>
          <div className="god-mode-toggle-stack">
            {toggles.map((toggle) => (
              <article key={toggle.id} className="god-mode-toggle-card">
                <div>
                  <p className="god-mode-toggle-title">{toggle.label}</p>
                  <p className="god-mode-toggle-key">{toggle.key}</p>
                  <p className="god-mode-toggle-desc">{toggle.description}</p>
                </div>
                <button
                  type="button"
                  className={`god-mode-switch ${toggle.is_enabled ? 'on' : 'off'}`}
                  disabled={Boolean(moduleBusy[`toggle-${toggle.key}`]) || !canWrite}
                  onClick={() => updateToggle(toggle.key, !toggle.is_enabled)}
                >
                  {toggle.is_enabled ? 'ON' : 'OFF'}
                </button>
              </article>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          id="logs"
          title="Activity Logs"
          subtitle="Browse, filter, export, and create event logs"
          icon={FileText}
          actions={(
            <>
              <button type="button" className="god-mode-btn" disabled={Boolean(moduleBusy.logsExport)} onClick={exportLogsCsv}>
                <Download size={14} /> Export CSV
              </button>
              <button type="button" className="god-mode-btn god-mode-btn-primary" disabled={Boolean(moduleBusy.logs)} onClick={fetchFilteredLogs}>
                <RefreshCw size={14} /> Refresh
              </button>
            </>
          )}
        >
          <div className="god-mode-form-grid god-mode-form-grid-3">
            <label>
              Module
              <input
                type="text"
                value={logFilters.module}
                onChange={(event) => setLogFilters((prev) => ({ ...prev, module: event.target.value }))}
                placeholder="api_monitor"
              />
            </label>
            <label>
              Level
              <select value={logFilters.level} onChange={(event) => setLogFilters((prev) => ({ ...prev, level: event.target.value }))}>
                <option value="">All</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </label>
            <label>
              Limit
              <input
                type="number"
                min="1"
                max="1000"
                value={logFilters.limit}
                onChange={(event) => setLogFilters((prev) => ({ ...prev, limit: event.target.value }))}
              />
            </label>
          </div>

          <div className="god-mode-form-grid god-mode-form-grid-2">
            <label>
              New Log Module
              <input
                type="text"
                value={newLogForm.module}
                onChange={(event) => setNewLogForm((prev) => ({ ...prev, module: event.target.value }))}
              />
            </label>
            <label>
              New Log Level
              <select value={newLogForm.level} onChange={(event) => setNewLogForm((prev) => ({ ...prev, level: event.target.value }))}>
                <option value="info">info</option>
                <option value="success">success</option>
                <option value="warning">warning</option>
                <option value="error">error</option>
              </select>
            </label>
            <label className="god-mode-col-span-2">
              Message
              <input
                type="text"
                value={newLogForm.message}
                onChange={(event) => setNewLogForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="Describe the event"
              />
            </label>
            <label className="god-mode-col-span-2">
              JSON Details
              <textarea
                rows="4"
                value={newLogForm.details}
                onChange={(event) => setNewLogForm((prev) => ({ ...prev, details: event.target.value }))}
              />
            </label>
          </div>
          <div className="god-mode-row-actions">
            <button
              type="button"
              className="god-mode-btn god-mode-btn-primary"
              disabled={Boolean(moduleBusy.logsCreate) || !newLogForm.message.trim() || !canWrite}
              onClick={createManualLog}
            >
              <Send size={14} /> Add Log
            </button>
          </div>

          <div className="god-mode-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Module</th>
                  <th>Level</th>
                  <th>Message</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.created_at)}</td>
                    <td>{entry.module}</td>
                    <td>
                      <span className={`god-mode-level-pill tone-${levelTone(entry.level)}`}>{entry.level}</span>
                    </td>
                    <td>{entry.message}</td>
                    <td>{entry.created_by_email || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>

        <SectionPanel id="stress" title="Stress Testing Simulator" subtitle="Synthetic load simulation and stability verdict" icon={Gauge}>
          <div className="god-mode-form-grid">
            <label>
              Scenario
              <select value={stressForm.scenario} onChange={(event) => setStressForm({ scenario: event.target.value })}>
                {STRESS_SCENARIOS.map((scenario) => (
                  <option key={scenario.value} value={scenario.value}>
                    {scenario.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="god-mode-row-actions">
            <button
              type="button"
              className="god-mode-btn god-mode-btn-primary"
              disabled={Boolean(moduleBusy.stress) || !canWrite}
              onClick={runStressSimulation}
            >
              <Gauge size={14} /> Run Stress Test
            </button>
          </div>
          {stressResult ? (
            <>
              <div className="god-mode-kpi-strip">
                <span>Verdict: {stressResult.verdict}</span>
                <span>P50: {stressResult.metrics?.p50_ms} ms</span>
                <span>P95: {stressResult.metrics?.p95_ms} ms</span>
                <span>Error: {stressResult.metrics?.error_rate_percent}%</span>
                <span>CPU: {stressResult.metrics?.cpu_percent}%</span>
                <span>Memory: {stressResult.metrics?.memory_percent}%</span>
              </div>
              <ul className="god-mode-inline-list">
                {(stressResult.recommendations || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
        </SectionPanel>

        <SectionPanel id="bugs" title="Bug Reporting System" subtitle="Log defects and track progress through resolution" icon={Bug}>
          <div className="god-mode-form-grid god-mode-form-grid-2">
            <label>
              Title
              <input type="text" value={bugForm.title} onChange={(event) => setBugForm((prev) => ({ ...prev, title: event.target.value }))} />
            </label>
            <label>
              Module
              <input type="text" value={bugForm.module} onChange={(event) => setBugForm((prev) => ({ ...prev, module: event.target.value }))} />
            </label>
            <label>
              Severity
              <select value={bugForm.severity} onChange={(event) => setBugForm((prev) => ({ ...prev, severity: event.target.value }))}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </label>
            <label className="god-mode-col-span-2">
              Steps To Reproduce
              <textarea
                rows="4"
                value={bugForm.steps_to_reproduce}
                onChange={(event) => setBugForm((prev) => ({ ...prev, steps_to_reproduce: event.target.value }))}
              />
            </label>
          </div>
          <div className="god-mode-row-actions">
            <button
              type="button"
              className="god-mode-btn god-mode-btn-primary"
              disabled={Boolean(moduleBusy.bugsCreate) || !bugForm.title.trim() || !bugForm.steps_to_reproduce.trim()}
              onClick={createBugReport}
            >
              <Send size={14} /> Submit Bug
            </button>
          </div>

          <div className="god-mode-bug-stack">
            {bugReports.map((bug) => {
              const draft = bugDrafts[bug.id] || {}
              const statusValue = draft.status ?? bug.status
              const assigneeValue = draft.assigned_to ?? bug.assigned_to ?? ''

              return (
                <article key={bug.id} className="god-mode-bug-card">
                  <div className="god-mode-bug-head">
                    <div>
                      <p className="god-mode-bug-title">{bug.title}</p>
                      <p className="god-mode-bug-meta">
                        {bug.module} • {bug.severity} • opened {formatDate(bug.created_at)}
                      </p>
                    </div>
                    <span className={`god-mode-level-pill tone-${levelTone(bug.status === 'resolved' ? 'success' : bug.status === 'in_progress' ? 'warning' : 'info')}`}>
                      {bug.status}
                    </span>
                  </div>

                  <p className="god-mode-bug-steps">{bug.steps_to_reproduce}</p>

                  <div className="god-mode-form-grid god-mode-form-grid-2">
                    <label>
                      Status
                      <select value={statusValue} onChange={(event) => updateBugDraft(bug.id, { status: event.target.value })}>
                        {BUG_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Assignee UUID
                      <input
                        type="text"
                        value={assigneeValue}
                        onChange={(event) => updateBugDraft(bug.id, { assigned_to: event.target.value })}
                        placeholder="Optional user UUID"
                      />
                    </label>
                  </div>

                  <div className="god-mode-row-actions">
                    <button
                      type="button"
                      className="god-mode-btn"
                      disabled={Boolean(moduleBusy[`bugPatch-${bug.id}`]) || !canWrite}
                      onClick={() => patchBugReport(bug)}
                    >
                      Update Bug
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </SectionPanel>

        <SectionPanel
          id="settings"
          title="God Mode Settings"
          subtitle="Theme, refresh interval, retention policy, and safe reset"
          icon={Settings}
          actions={(
            <>
              <button type="button" className="god-mode-btn" disabled={Boolean(moduleBusy.safeReset) || !canWrite} onClick={safeModeReset}>
                Safe Reset
              </button>
              <button
                type="button"
                className="god-mode-btn god-mode-btn-primary"
                disabled={Boolean(moduleBusy.settings) || !canWrite}
                onClick={saveSettings}
              >
                Save Settings
              </button>
            </>
          )}
        >
          <div className="god-mode-form-grid god-mode-form-grid-2">
            <label>
              Theme
              <select value={settingsModel.theme} onChange={(event) => setSettingsModel((prev) => ({ ...prev, theme: event.target.value }))}>
                <option value="system">system</option>
                <option value="light">light</option>
                <option value="dark">dark</option>
              </select>
            </label>
            <label>
              Auto Refresh Interval (seconds)
              <input
                type="number"
                min="5"
                max="3600"
                value={settingsModel.auto_refresh_interval}
                onChange={(event) => setSettingsModel((prev) => ({ ...prev, auto_refresh_interval: event.target.value }))}
              />
            </label>
            <label>
              Log Retention Days
              <input
                type="number"
                min="1"
                max="365"
                value={settingsModel.log_retention_days}
                onChange={(event) => setSettingsModel((prev) => ({ ...prev, log_retention_days: event.target.value }))}
              />
            </label>
            <label className="god-mode-checkbox">
              <input
                type="checkbox"
                checked={Boolean(settingsModel.notification_sound)}
                onChange={(event) => setSettingsModel((prev) => ({ ...prev, notification_sound: event.target.checked }))}
              />
              <span>Enable notification sound</span>
            </label>
          </div>

          <div className="god-mode-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {settingsRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.key}</td>
                    <td>{String(row.value)}</td>
                    <td>{formatDate(row.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>

        <SectionPanel id="notifications" title="Notification Simulator" subtitle="Fire controlled delivery tests by role" icon={Bell}>
          <div className="god-mode-form-grid god-mode-form-grid-2">
            <label>
              Target Role
              <select
                value={notificationForm.target_role}
                onChange={(event) => setNotificationForm((prev) => ({ ...prev, target_role: event.target.value }))}
              >
                <option value="all">all</option>
                <option value="god">god</option>
                <option value="admin">admin</option>
                <option value="teacher">teacher</option>
                <option value="student">student</option>
              </select>
            </label>
            <label className="god-mode-col-span-2">
              Message
              <textarea
                rows="3"
                value={notificationForm.message}
                onChange={(event) => setNotificationForm((prev) => ({ ...prev, message: event.target.value }))}
                placeholder="Leave blank to use default simulation message"
              />
            </label>
          </div>
          <div className="god-mode-row-actions">
            <button
              type="button"
              className="god-mode-btn god-mode-btn-primary"
              disabled={Boolean(moduleBusy.notifications) || !canWrite}
              onClick={runNotificationSimulation}
            >
              <Bell size={14} /> Trigger Notification Test
            </button>
          </div>

          {notificationResult ? (
            <div className="god-mode-result-card">
              <p className="god-mode-result-title">Delivery Report</p>
              <p>
                Target: <strong>{notificationResult.target_role}</strong> | Delivered:{' '}
                <strong>{notificationResult.delivered_count}</strong>
              </p>
              {notificationResult.sample_recipients?.length ? (
                <p>Sample recipients: {notificationResult.sample_recipients.join(', ')}</p>
              ) : (
                <p>No recipients found for this role filter.</p>
              )}
            </div>
          ) : null}
        </SectionPanel>
      </div>

      <section className="god-mode-footer-strip">
        <div>
          <p className="god-mode-footer-title">Recent Overview Logs</p>
          <p className="god-mode-muted">Quick pulse of dashboard events, sorted by latest first.</p>
        </div>
        <div className="god-mode-inline-log-list">
          {(overview?.recent_logs || []).map((entry) => (
            <article key={entry.id} className="god-mode-inline-log-item">
              <div className="god-mode-inline-log-head">
                <span className={`god-mode-level-pill tone-${levelTone(entry.level)}`}>{entry.level}</span>
                <span>{formatDate(entry.created_at)}</span>
              </div>
              <p>{entry.message}</p>
              <p className="god-mode-muted-small">{entry.module} • {entry.created_by__email || 'system'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="god-mode-status-bar">
        <div>
          <CheckCircle2 size={16} />
          <span>Protected backend authorization enabled ({accessMode})</span>
        </div>
        <div>
          <XCircle size={16} />
          <span>Normal admin/teacher/student accounts are denied unless allowlisted</span>
        </div>
      </section>
    </div>
  )
}

export default GodModeDashboard
