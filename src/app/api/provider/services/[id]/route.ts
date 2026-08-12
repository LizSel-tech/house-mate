import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { buildUpdates, query, queryOne } from '@/lib/db';
import type { ArtisanProfile, Service } from '@/types/db';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const profile = await queryOne<ArtisanProfile>(
    `SELECT * FROM artisan_profiles WHERE user_id = $1`,
    [user.id],
  );
  if (!profile) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  const existing = await queryOne<Service>(
    `SELECT * FROM services WHERE id = $1 AND artisan_id = $2`,
    [id, profile.id],
  );
  if (!existing) {
    return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    priceAmount?: number | string;
    priceUnit?: string;
    isActive?: boolean;
  };

  const { sets, values } = buildUpdates({
    title: body.title !== undefined ? body.title.trim() : undefined,
    description: body.description !== undefined ? body.description.trim() || null : undefined,
    price_amount: body.priceAmount !== undefined ? Number(body.priceAmount) : undefined,
    price_unit: body.priceUnit !== undefined ? body.priceUnit.trim() || 'job' : undefined,
    is_active: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
  });

  if (!sets.length) {
    return NextResponse.json({ service: existing });
  }

  values.push(id);
  const service = await queryOne<Service>(
    `UPDATE services SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );

  return NextResponse.json({ service });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const profile = await queryOne<ArtisanProfile>(
    `SELECT * FROM artisan_profiles WHERE user_id = $1`,
    [user.id],
  );
  if (!profile) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  const existing = await queryOne<Service>(
    `SELECT * FROM services WHERE id = $1 AND artisan_id = $2`,
    [id, profile.id],
  );
  if (!existing) {
    return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
  }

  await query(`DELETE FROM services WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
