import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { SilenceRecord } from '@/shared/api/consoleTypes';
import { formatTime } from '@/shared/format';
import { safeText } from '@/shared/privacy/redact';
import { Button, Dialog, Field, SegmentedControl, TextInput, useToast } from '@/shared/ui';

/** The silence endpoints (`/api/silences`); the console passes its data source. */
export interface SilenceApi {
  listSilences: () => Promise<SilenceRecord[]>;
  createSilence: (silence: { target: string; reason: string; minutes: number }) => Promise<SilenceRecord>;
  liftSilence: (id: string) => Promise<unknown>;
}

export interface SilenceDialogProps {
  open: boolean;
  onClose: () => void;
  /** Monitor (or group) id whose alerts are held. */
  target: string;
  targetName: string;
  source: SilenceApi;
  onSilenced?: (silence: SilenceRecord) => void;
}

const DURATIONS = ['15', '60', '240', '1440', 'custom'] as const;
type Duration = (typeof DURATIONS)[number];
const MAX_MINUTES = 7 * 24 * 60;
const SILENCES_KEY = ['silences'];

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Holds the notifications of one monitor for a while (checks and incidents go on). */
export function SilenceDialog({ open, onClose, target, targetName, source, onSilenced }: SilenceDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [why, setWhy] = useState('');
  const [duration, setDuration] = useState<Duration>('60');
  const [custom, setCustom] = useState('120');
  const [errors, setErrors] = useState<{ reason?: string; minutes?: string }>({});

  const create = useMutation({
    mutationFn: (minutes: number) => source.createSilence({ target, reason: why.trim(), minutes }),
    onSuccess: async (silence) => {
      toast({ title: t('ops.incidents.silencedUntil', { time: formatTime(silence.until) }), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: SILENCES_KEY });
      onSilenced?.(silence);
      setWhy('');
      onClose();
    },
    onError: (error) => toast({ title: reason(error), tone: 'DOWN' }),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const minutes = duration === 'custom' ? Number(custom) : Number(duration);
    const next = {
      reason: why.trim() ? undefined : t('ops.incidents.silenceReasonRequired'),
      minutes: Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_MINUTES ? undefined : t('ops.incidents.silenceMinutesRange'),
    };
    setErrors(next);
    if (next.reason || next.minutes) return;
    create.mutate(minutes);
  }

  const formId = `silence-${target}`;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('ops.incidents.silenceTitle', { name: safeText(targetName) })}
      description={t('ops.incidents.silenceDescription')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('ops.incidents.cancel')}
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={create.isPending}>
            {t('ops.incidents.silenceConfirm')}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate className="flex flex-col gap-4" onSubmit={submit}>
        <Field label={t('ops.incidents.silenceReason')} hint={t('ops.incidents.silenceReasonHint')} error={errors.reason} required>
          <TextInput value={why} onChange={(e) => setWhy(e.target.value)} />
        </Field>
        <SegmentedControl
          label={t('ops.incidents.silenceDuration')}
          value={duration}
          onChange={setDuration}
          options={DURATIONS.map((value) => ({ value, label: t(`ops.incidents.durations.${value}`) }))}
        />
        {duration === 'custom' && (
          <Field label={t('ops.incidents.silenceMinutes')} hint={t('ops.incidents.silenceMinutesHint')} error={errors.minutes}>
            <TextInput type="number" min={1} max={MAX_MINUTES} value={custom} onChange={(e) => setCustom(e.target.value)} />
          </Field>
        )}
        {duration !== 'custom' && errors.minutes && (
          <p role="alert" className="m-0 text-sm text-down-text">
            {errors.minutes}
          </p>
        )}
      </form>
    </Dialog>
  );
}

export interface ActiveSilenceProps {
  target: string;
  source: SilenceApi;
  /** Lifting a silence is an edit (editors only). */
  editable: boolean;
}

/** The active silence of a target, if any, with "Lift silence". */
export function ActiveSilence({ target, source, editable }: ActiveSilenceProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const silences = useQuery({ queryKey: SILENCES_KEY, queryFn: () => source.listSilences() });
  const lift = useMutation({
    mutationFn: (id: string) => source.liftSilence(id),
    onSuccess: async () => {
      toast({ title: t('ops.incidents.silenceLifted'), tone: 'OK' });
      await queryClient.invalidateQueries({ queryKey: SILENCES_KEY });
    },
    onError: (error) => toast({ title: reason(error), tone: 'DOWN' }),
  });
  const now = Date.now();
  const active = (silences.data ?? []).find((s) => s.target === target && Date.parse(s.until) > now);
  if (!active) return null;
  return (
    <p data-silence role="status" className="m-0 flex flex-wrap items-center gap-3 rounded-md border border-line bg-s2 px-4 py-2 text-base text-muted">
      <span className="min-w-0 flex-1">{t('ops.incidents.activeSilence', { time: formatTime(active.until), reason: safeText(active.reason) })}</span>
      {editable && (
        <Button size="sm" variant="secondary" loading={lift.isPending} onClick={() => lift.mutate(active.id)}>
          {t('ops.incidents.liftSilence')}
        </Button>
      )}
    </p>
  );
}
