'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { ConfirmModal, IconActionButton } from '@/components/admin/AdminModal';

type Service = {
  id: string;
  title: string;
  description: string | null;
  priceAmount: string | number;
  priceUnit: string;
  isActive: boolean;
};

type Filter = 'all' | 'active' | 'inactive';

function formatGhs(n: number) {
  return `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function unitLabel(unit: string) {
  if (unit === 'hour') return 'Per hour';
  if (unit === 'visit') return 'Per visit';
  return 'Per job';
}

const emptyForm = {
  title: '',
  description: '',
  priceAmount: '',
  priceUnit: 'job',
};

export default function ProviderServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const load = async () => {
    const res = await fetch('/api/provider/services');
    const data = await res.json();
    if (res.ok) setServices(data.services || []);
  };

  useEffect(() => {
    load();
  }, []);

  const activeCount = services.filter((s) => s.isActive).length;
  const inactiveCount = services.length - activeCount;

  const visible = useMemo(() => {
    if (filter === 'active') return services.filter((s) => s.isActive);
    if (filter === 'inactive') return services.filter((s) => !s.isActive);
    return services;
  }, [services, filter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setPanelOpen(true);
  };

  const openEdit = (service: Service) => {
    setEditingId(service.id);
    setForm({
      title: service.title,
      description: service.description || '',
      priceAmount: String(service.priceAmount),
      priceUnit: service.priceUnit || 'job',
    });
    setError('');
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        priceAmount: form.priceAmount,
        priceUnit: form.priceUnit,
      };

      const res = await fetch(
        editingId ? `/api/provider/services/${editingId}` : '/api/provider/services',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save service.');
        return;
      }
      setMessage(editingId ? 'Service updated.' : 'Service added to your catalog.');
      closePanel();
      await load();
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (service: Service) => {
    setBusyId(service.id);
    setMessage('');
    try {
      await fetch(`/api/provider/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      setMessage(service.isActive ? 'Service disabled.' : 'Service enabled.');
      await load();
    } finally {
      setBusyId('');
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setMessage('');
    try {
      await fetch(`/api/provider/services/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      setMessage('Service deleted.');
      await load();
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
            Catalog
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Services & prices
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            List what you offer. Customers see these when they search verified artisans.
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="!rounded-xl !min-h-[44px] w-fit">
          <Icon name="PlusIcon" size={16} />
          Add service
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active', value: activeCount },
          { label: 'Inactive', value: inactiveCount },
          { label: 'Total', value: services.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-xl font-extrabold text-foreground tabular-nums mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          {message}
        </p>
      )}

      {panelOpen && (
        <form
          onSubmit={onSave}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon name={editingId ? 'PencilSquareIcon' : 'PlusIcon'} size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {editingId ? 'Edit service' : 'Add a service'}
                </h2>
                <p className="text-xs text-muted-foreground">Title, price, and what’s included</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close form"
              onClick={closePanel}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            >
              <Icon name="XMarkIcon" size={18} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Fix leaking kitchen sink"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what’s included"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Price (GHS)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.priceAmount}
                  onChange={(e) => setForm((f) => ({ ...f, priceAmount: e.target.value }))}
                  placeholder="200"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Unit
                </label>
                <Select
                  value={form.priceUnit}
                  onChange={(value) => setForm((f) => ({ ...f, priceUnit: value }))}
                  options={[
                    { value: 'job', label: 'Per job' },
                    { value: 'hour', label: 'Per hour' },
                    { value: 'visit', label: 'Per visit' },
                  ]}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={closePanel}
                disabled={loading}
                className="!rounded-xl !min-h-[40px]"
              >
                Cancel
              </Button>
              <Button type="submit" loading={loading} className="!rounded-xl !min-h-[40px]">
                {editingId ? 'Save changes' : 'Save service'}
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {([
          { id: 'all' as const, label: 'All', count: services.length },
          { id: 'active' as const, label: 'Active', count: activeCount },
          { id: 'inactive' as const, label: 'Inactive', count: inactiveCount },
        ]).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${
              filter === f.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
            <Icon name="WrenchScrewdriverIcon" size={22} />
          </div>
          <p className="font-semibold text-foreground">
            {services.length === 0 ? 'No services yet' : 'No services match this filter'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {services.length === 0
              ? 'Add your first offering to appear in customer search.'
              : 'Try another filter or add a new service.'}
          </p>
          {services.length === 0 && (
            <Button type="button" onClick={openCreate} className="mt-4 !rounded-xl !min-h-[40px]">
              Add service
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Service', 'Price', 'Unit', 'Status', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((service) => (
                  <tr
                    key={service.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            service.isActive
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon name="TagIcon" size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{service.title}</p>
                          {service.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-foreground whitespace-nowrap">
                      {formatGhs(Number(service.priceAmount))}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                      {unitLabel(service.priceUnit)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          service.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {service.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <IconActionButton
                          icon="PencilSquareIcon"
                          label="Edit service"
                          tone="neutral"
                          disabled={busyId === service.id}
                          onClick={() => openEdit(service)}
                        />
                        <IconActionButton
                          icon={service.isActive ? 'EyeSlashIcon' : 'EyeIcon'}
                          label={service.isActive ? 'Disable service' : 'Enable service'}
                          tone={service.isActive ? 'neutral' : 'success'}
                          disabled={busyId === service.id}
                          onClick={() => void toggleActive(service)}
                        />
                        <IconActionButton
                          icon="TrashIcon"
                          label="Delete service"
                          tone="danger"
                          disabled={busyId === service.id}
                          onClick={() => setDeleteTarget(service)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            Showing {visible.length} of {services.length} services
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete service?"
        description={
          deleteTarget
            ? `Remove “${deleteTarget.title}” from your catalog. Customers will no longer see this listing.`
            : undefined
        }
        icon="TrashIcon"
        confirmLabel="Delete"
        tone="danger"
        loading={busyId === deleteTarget?.id}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
