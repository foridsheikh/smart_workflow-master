import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Clock, Play, Sparkles, Timer, XCircle } from 'lucide-react'
import { tasksApi } from '../lib/endpoints'
import { parseServerDate, formatDateTime } from '../lib/format'
import { Button, Field, Input, Modal, cn } from './ui'

/** Calculates remaining mm:ss from a target date. */
export function useRemainingTime(targetDate, onExpire) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const d = parseServerDate(targetDate)
    return d ? Math.max(0, Math.floor((d.getTime() - Date.now()) / 1000)) : 0
  })

  useEffect(() => {
    const d = parseServerDate(targetDate)
    if (!d) return

    const tick = () => {
      const diff = Math.max(0, Math.floor((d.getTime() - Date.now()) / 1000))
      setTimeLeft(diff)
      if (diff === 0 && onExpire) {
        onExpire()
      }
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isExpired = timeLeft <= 0

  let formatted = ''
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMins = minutes % 60
    formatted = `${hours}h ${remainingMins}m`
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  } else {
    formatted = `${seconds}s`
  }

  return { timeLeft, minutes, seconds, isExpired, formatted }
}

/** Small badge for task cards/board when auto-assign is active. */
export function AutoAssignBadge({ autoAssignAt }) {
  if (!autoAssignAt) return null
  const { isExpired, formatted } = useRemainingTime(autoAssignAt)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border shadow-2xs transition',
        isExpired
          ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
      )}
      title={`Auto-assignment scheduled for ${formatDateTime(autoAssignAt)}`}
    >
      <Timer className="size-3" />
      {isExpired ? 'Assigning now…' : `Auto-assign in ${formatted}`}
    </span>
  )
}

/** Prominent banner shown on TaskDetailPage and AllocationPage. */
export function AutoAssignBanner({ task, onUpdated }) {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)

  const refreshAll = () => {
    ;['tasks', 'task', 'dashboard', 'recommendations', 'task-history'].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k] })
    )
    onUpdated?.()
  }

  const { isExpired, formatted } = useRemainingTime(task.auto_assign_at, () => {
    // When timer hits 0, poll after 2 seconds to pick up the assigned state
    setTimeout(refreshAll, 2500)
  })

  const cancelMutation = useMutation({
    mutationFn: () => tasksApi.cancelAutoAssign(task.id),
    onSuccess: () => {
      toast.success('Auto-assignment timer cancelled')
      refreshAll()
    },
    onError: (e) => toast.error(e.message)
  })

  const assignNowMutation = useMutation({
    mutationFn: () => tasksApi.autoAssign(task.id),
    onSuccess: (res) => {
      toast.success(res.message || 'Assigned to best match')
      refreshAll()
    },
    onError: (e) => toast.error(e.message)
  })

  if (!task.auto_assign_at || task.status !== 'PENDING' || task.assigned_employee_id) {
    return null
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-blue-50 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Timer className="size-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wide uppercase text-indigo-700">Scheduled Auto-Assignment</span>
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                  {isExpired ? 'Processing allocation…' : `Remaining: ${formatted}`}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                At <strong>{formatDateTime(task.auto_assign_at)}</strong>, this task will automatically assign to whoever holds the highest match score from the allocation engine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              size="sm"
              icon={Sparkles}
              onClick={() => assignNowMutation.mutate()}
              loading={assignNowMutation.isPending}
              disabled={isExpired}
            >
              Assign best match now
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setModalOpen(true)}
              disabled={assignNowMutation.isPending || cancelMutation.isPending}
            >
              Change timer
            </Button>
            <Button
              size="sm"
              variant="danger-ghost"
              icon={XCircle}
              onClick={() => cancelMutation.mutate()}
              loading={cancelMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ScheduleAutoAssignModal
          taskId={task.id}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onScheduled={refreshAll}
        />
      )}
    </>
  )
}

/** Modal to schedule or change auto-assignment timer. */
export function ScheduleAutoAssignModal({ taskId, open, onClose, onScheduled }) {
  const [delay, setDelay] = useState('10')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (mins) => tasksApi.scheduleAutoAssign(taskId, Number(mins)),
    onSuccess: (res) => {
      toast.success(res.message || 'Auto-assignment timer set')
      ;['tasks', 'task', 'dashboard', 'recommendations', 'task-history'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] })
      )
      onScheduled?.()
      onClose()
    },
    onError: (e) => toast.error(e.message)
  })

  const submit = (e) => {
    e.preventDefault()
    if (!delay || Number(delay) <= 0) {
      toast.error('Please enter a valid time in minutes (minimum 1)')
      return
    }
    mutation.mutate(delay)
  }

  if (!open) return null

  return (
    <Modal
      open
      onClose={onClose}
      title="Set Auto-assign Timer"
      description="Choose how many minutes from now to evaluate candidates and assign to the best match."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={Timer} onClick={submit} loading={mutation.isPending}>
            Start Auto-Assign Timer
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quick Presets</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { label: '2 min', val: '2' },
              { label: '5 min', val: '5' },
              { label: '10 min', val: '10' },
              { label: '15 min', val: '15' },
              { label: '30 min', val: '30' },
              { label: '1 hour', val: '60' },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setDelay(p.val)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  delay === p.val
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Delay in minutes">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max="10080"
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
              placeholder="e.g. 10"
              className="text-base"
              autoFocus
            />
            <span className="text-sm font-medium text-slate-500">minutes</span>
          </div>
        </Field>

        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
          💡 After <strong>{delay || 0} minute(s)</strong>, the background allocation engine will match candidates based on
          skill level (40%), workload balance (25%), availability (20%), and deadline fit (15%), and automatically assign
          the top scorer.
        </div>
      </form>
    </Modal>
  )
}
