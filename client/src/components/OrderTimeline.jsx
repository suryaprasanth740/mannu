import { Check, X } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import { fmtDateTime } from '../lib/format.js';

const FLOWS = {
  delivery: ['placed', 'accepted', 'packed', 'out_for_delivery', 'delivered'],
  pickup: ['placed', 'accepted', 'packed', 'ready_for_pickup', 'picked_up'],
};

export default function OrderTimeline({ order }) {
  const { t, lang } = useI18n();
  const flow = FLOWS[order.fulfillment.method];
  const closed = ['rejected', 'cancelled'].includes(order.status);
  const reachedAt = Object.fromEntries((order.statusHistory || []).map((h) => [h.status, h.at]));
  const currentIdx = closed ? -1 : flow.indexOf(order.status);

  if (closed) {
    const h = [...order.statusHistory].reverse().find((x) => x.status === order.status);
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-chilli-100 p-4 text-chilli-600">
        <X size={20} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">{t(`status_${order.status}`)}</p>
          {(order.rejectionReason || h?.note) && <p className="text-sm">{t('reason')}: {order.rejectionReason || h?.note}</p>}
          {h?.at && <p className="text-xs opacity-80">{fmtDateTime(h.at, lang)}</p>}
        </div>
      </div>
    );
  }

  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Order progress">
      {flow.map((s, i) => {
        const done = i <= currentIdx;
        return (
          <li key={s} className="flex flex-col items-center text-center">
            <div className="relative flex w-full items-center justify-center">
              {i > 0 && <span className={`absolute top-1/2 right-1/2 h-1 w-full -translate-y-1/2 ${i <= currentIdx ? 'bg-leaf-600' : 'bg-line'}`} />}
              <span
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                  done ? 'border-leaf-600 bg-leaf-600 text-white' : 'border-line bg-white text-soil-300'
                } ${i === currentIdx ? 'ring-4 ring-leaf-100' : ''}`}
              >
                {done ? <Check size={14} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-soil-300" />}
              </span>
            </div>
            <span className={`mt-1.5 text-[11px] leading-tight sm:text-xs ${done ? 'font-semibold text-leaf-900' : 'text-soil-500'}`}>{t(`status_${s}`)}</span>
            {reachedAt[s] && done && <span className="hidden text-[10px] text-soil-500 sm:block">{fmtDateTime(reachedAt[s], lang)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
