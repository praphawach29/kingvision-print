-- Invoice table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  quotation_ref TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  customer_company TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12,2) DEFAULT 0,
  vat_enabled BOOLEAN DEFAULT FALSE,
  vat_rate NUMERIC(5,2) DEFAULT 7,
  vat_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  payment_terms TEXT DEFAULT '',
  invoice_date TEXT DEFAULT '',
  due_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='invoices' AND policyname='Admin can manage invoices') THEN
    CREATE POLICY "Admin can manage invoices" ON public.invoices
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
  END IF;
END $$;

-- Delivery Order table
CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  do_number TEXT NOT NULL,
  invoice_ref TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  customer_company TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_date DATE,
  carrier TEXT DEFAULT '',
  tracking_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'returned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delivery_orders' AND policyname='Admin can manage delivery_orders') THEN
    CREATE POLICY "Admin can manage delivery_orders" ON public.delivery_orders
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
  END IF;
END $$;

-- Job Card table
CREATE TABLE IF NOT EXISTS public.job_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jc_number TEXT NOT NULL,
  customer_name TEXT DEFAULT '',
  customer_company TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  equipment_brand TEXT DEFAULT '',
  equipment_model TEXT DEFAULT '',
  equipment_serial TEXT DEFAULT '',
  symptoms TEXT DEFAULT '',
  technician TEXT DEFAULT '',
  diagnosis TEXT DEFAULT '',
  service_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_cost NUMERIC(12,2) DEFAULT 0,
  actual_cost NUMERIC(12,2) DEFAULT 0,
  warranty_days INTEGER DEFAULT 30,
  notes TEXT DEFAULT '',
  received_date DATE,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'diagnosing', 'repairing', 'done', 'delivered')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='job_cards' AND policyname='Admin can manage job_cards') THEN
    CREATE POLICY "Admin can manage job_cards" ON public.job_cards
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
