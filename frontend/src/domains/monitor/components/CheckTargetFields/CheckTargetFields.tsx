import { useTranslation } from 'react-i18next';
import { INPUT_CLASS, SELECT_CLASS } from '@/shared/ui';
import { DNS_RECORD_TYPES, type MonitorFormState } from '../../form';
import type { DnsRecordType } from '@/shared/api/monitorTargets';
import { FormField } from '../FormField';

export interface CheckTargetFieldsProps {
  state: MonitorFormState;
  onChange: (patch: Partial<MonitorFormState>) => void;
}

const HOST_KINDS = ['TCP', 'PING', 'DNS', 'CERT', 'GRPC'];
const PORT_KINDS = ['TCP', 'CERT', 'GRPC'];
const PLACEHOLDER_PORT: Record<string, string> = { TCP: '5432', CERT: '443', GRPC: '50051' };

/** Targets of the check monitors: TCP, ping, push, DNS, certificate, gRPC health and Kafka lag. */
export function CheckTargetFields({ state, onChange }: CheckTargetFieldsProps) {
  const { t } = useTranslation();
  const text = (key: keyof MonitorFormState & string, label: string, placeholder?: string, mono = true) => (
    <FormField label={label}>
      {(id) => (
        <input
          id={id}
          className={`${INPUT_CLASS} ${mono ? 'font-mono' : ''}`}
          placeholder={placeholder}
          value={String(state[key] ?? '')}
          onChange={(e) => onChange({ [key]: e.target.value } as Partial<MonitorFormState>)}
        />
      )}
    </FormField>
  );

  return (
    <div className="grid grid-cols-1 gap-[0.6rem] sm:grid-cols-[1fr_8rem]">
      {HOST_KINDS.includes(state.type) && text('host', t('monitorForm.host'), state.type === 'DNS' ? 'orbit.example' : 'db.internal')}
      {PORT_KINDS.includes(state.type) && (
        <FormField label={t('monitorForm.port')}>
          {(id) => (
            <input
              id={id}
              inputMode="numeric"
              className={`${INPUT_CLASS} font-mono`}
              placeholder={PLACEHOLDER_PORT[state.type]}
              value={state.port}
              onChange={(e) => onChange({ port: e.target.value.replace(/\D/g, '') })}
            />
          )}
        </FormField>
      )}
      {state.type === 'DNS' && (
        <>
          <FormField label={t('monitorForm.recordType')}>
            {(id) => (
              <select id={id} className={SELECT_CLASS} value={state.recordType} onChange={(e) => onChange({ recordType: e.target.value as DnsRecordType })}>
                {DNS_RECORD_TYPES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          {text('expected', t('monitorForm.expected'))}
        </>
      )}
      {state.type === 'GRPC' && (
        <>
          {text('service', t('monitorForm.service'))}
          <label className="flex items-center gap-[0.4rem] self-end text-[0.85rem]">
            <input type="checkbox" checked={state.tls} onChange={(e) => onChange({ tls: e.target.checked })} />
            {t('monitorForm.tls')}
          </label>
        </>
      )}
      {state.type === 'KAFKA' && (
        <>
          {text('bootstrapServers', t('monitorForm.bootstrapServers'), 'kafka-1:9092,kafka-2:9092')}
          {text('consumerGroup', t('monitorForm.consumerGroup'))}
          {text('topic', t('monitorForm.topic'))}
        </>
      )}
      {state.type === 'PUSH' && (
        <>
          <FormField label={t('monitorForm.maxSilence')}>
            {(id) => (
              <input
                id={id}
                type="number"
                min={60}
                className={`${INPUT_CLASS} font-mono`}
                value={state.maxSilenceSeconds}
                onChange={(e) => onChange({ maxSilenceSeconds: Number(e.target.value) })}
              />
            )}
          </FormField>
          <p className="m-0 text-[0.78rem] text-dim sm:col-span-2">{t('monitorForm.pushNote')}</p>
        </>
      )}
    </div>
  );
}
