export const BOOKING_DATA_SQL = `
  SELECT to_jsonb(b) || jsonb_build_object(
    'user', jsonb_build_object('id', u.id, 'name', u.name, 'phone', u.phone),
    'artisan', to_jsonb(a) || jsonb_build_object(
      'user', jsonb_build_object('id', au.id, 'name', au.name, 'phone', au.phone)
    ),
    'service', to_jsonb(s),
    'payment', to_jsonb(p),
    'review', to_jsonb(r)
  ) AS data
  FROM bookings b
  JOIN users u ON u.id = b.user_id
  JOIN artisan_profiles a ON a.id = b.artisan_id
  JOIN users au ON au.id = a.user_id
  LEFT JOIN services s ON s.id = b.service_id
  LEFT JOIN payments p ON p.booking_id = b.id
  LEFT JOIN reviews r ON r.booking_id = b.id
`;
