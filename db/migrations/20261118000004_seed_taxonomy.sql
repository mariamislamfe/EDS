-- =====================================================================
-- Initial taxonomy & settings. Everything here is editable in /admin.
-- Categories are derived from the collections in the exported store CSV.
-- Shipping fees and contact details are intentionally left unset —
-- the store owner configures them in the dashboard.
-- =====================================================================

insert into public.academic_years (slug, number, name_en, name_ar, tagline_en, tagline_ar, sort_order) values
  ('first-year',  1, 'First Year',  'الفرقة الأولى', 'Wax, carving and your first lab kit.',            'الشمع والنحت وأول أدوات المعمل.', 1),
  ('second-year', 2, 'Second Year', 'الفرقة الثانية', 'Operative basics, burs and your first handpiece.', 'أساسيات العلاج التحفظي والفريز وأول تربينة.', 2),
  ('third-year',  3, 'Third Year',  'الفرقة الثالثة', 'Fixed prosthodontics and casts.',                   'التركيبات الثابتة والكاستات.', 3),
  ('fourth-year', 4, 'Fourth Year', 'الفرقة الرابعة', 'Clinical materials for fixed and endo cases.',      'خامات الحالات الإكلينيكية للتركيبات والعصب.', 4),
  ('fifth-year',  5, 'Fifth Year',  'الفرقة الخامسة', 'Everything for your final clinics.',                'كل ما تحتاجه لعيادات السنة النهائية.', 5)
on conflict (slug) do nothing;

insert into public.specialties (slug, name_en, name_ar, description_en, description_ar, sort_order) values
  ('restorative',    'Restorative Dentistry', 'العلاج التحفظي',     'Composites, matrices, polishing and operative instruments.', 'الكومبوزيت والماتريكس والتلميع وأدوات العلاج التحفظي.', 1),
  ('endodontics',    'Endodontics',           'علاج الجذور',        'Files, obturation, apex locators and endomotors.',          'الفايلات والحشو وأجهزة قياس الطول والإندوموتور.', 2),
  ('orthodontics',   'Orthodontics',          'تقويم الأسنان',      'Pliers, wires and ortho essentials.',                       'البلايرز والسلك وأساسيات التقويم.', 3),
  ('prosthodontics', 'Prosthodontics',        'التركيبات',          'Impression materials, temporaries and cements.',            'خامات الطبعات والتركيبات المؤقتة والأسمنت.', 4),
  ('periodontics',   'Periodontics',          'علاج اللثة',         'Scalers, prophylaxis and periodontal care.',                'أجهزة التنظيف والتلميع وعناية اللثة.', 5),
  ('oral-surgery',   'Oral Surgery',          'جراحة الفم',         'Anesthesia, blades and surgical instruments.',              'البنج والمشارط والأدوات الجراحية.', 6),
  ('implantology',   'Implantology',          'زراعة الأسنان',      'Implant systems and surgical kits.',                        'أنظمة الزراعة والأدوات الجراحية.', 7),
  ('general',        'General Dentistry',     'طب الأسنان العام',   'Everyday clinic essentials and disposables.',               'مستلزمات العيادة اليومية والمستهلكات.', 8)
on conflict (slug) do nothing;

insert into public.categories (slug, name_en, name_ar, sort_order, show_on_home) values
  ('operative-instruments', 'Operative Instruments',     'أدوات العلاج التحفظي', 1,  true),
  ('endodontic-supplies',   'Endodontic Supplies',       'مستلزمات علاج الجذور', 2,  true),
  ('fixed-prosthodontics',  'Fixed Prosthodontics',      'التركيبات الثابتة',    3,  true),
  ('hand-instruments',      'Hand Instruments',          'الأدوات اليدوية',      4,  true),
  ('burs',                  'Burs',                      'الفريز',               5,  true),
  ('handpieces',            'Handpieces & Rotary',       'التربينات والروتاري',  6,  true),
  ('composites',            'Composites',                'الكومبوزيت',           7,  false),
  ('polishing',             'Finishing & Polishing',     'التشطيب والتلميع',     8,  false),
  ('matrices',              'Matrices & Contouring',     'الماتريكس والكونتور',  9,  false),
  ('isolation',             'Isolation',                 'العزل',                10, false),
  ('disposables',           'Disposables',               'المستهلكات',           11, true),
  ('equipment',             'Equipment & Devices',       'الأجهزة',              12, true),
  ('radiology',             'X-Ray & Developing',        'الأشعة والتحميض',      13, false),
  ('casts-teeth',           'Casts & Acrylic Teeth',     'الكاستات والأسنان الأكريليك', 14, false),
  ('orthodontic-instruments','Orthodontic Instruments',  'أدوات التقويم',        15, false),
  ('boxes-organizers',      'Boxes & Organizers',        'البوكسات والتنظيم',    16, false)
on conflict (slug) do nothing;

insert into public.governorates (name_en, name_ar, sort_order) values
  ('Cairo','القاهرة',1),('Giza','الجيزة',2),('Alexandria','الإسكندرية',3),('Dakahlia','الدقهلية',4),
  ('Qalyubia','القليوبية',5),('Gharbia','الغربية',6),('Sharqia','الشرقية',7),('Monufia','المنوفية',8),
  ('Beheira','البحيرة',9),('Kafr El Sheikh','كفر الشيخ',10),('Damietta','دمياط',11),('Port Said','بورسعيد',12),
  ('Ismailia','الإسماعيلية',13),('Suez','السويس',14),('Faiyum','الفيوم',15),('Beni Suef','بني سويف',16),
  ('Minya','المنيا',17),('Asyut','أسيوط',18),('Sohag','سوهاج',19),('Qena','قنا',20),('Luxor','الأقصر',21),
  ('Aswan','أسوان',22),('Red Sea','البحر الأحمر',23),('New Valley','الوادي الجديد',24),('Matrouh','مطروح',25),
  ('North Sinai','شمال سيناء',26),('South Sinai','جنوب سيناء',27)
on conflict do nothing;

insert into public.settings (key, value) values
  ('store', jsonb_build_object(
      'name_en', 'Al Esraa Dental Store', 'name_ar', 'الإسراء لأجهزة ومستلزمات طب الأسنان',
      'phone', null, 'whatsapp', null, 'email', null, 'address_en', null, 'address_ar', null,
      'instagram', null, 'facebook', null, 'working_hours_en', null, 'working_hours_ar', null)),
  ('announcement', jsonb_build_object('enabled', false, 'text_en', '', 'text_ar', '', 'href', null)),
  ('checkout', jsonb_build_object('email_required', false)),
  ('shipping', jsonb_build_object('free_shipping_threshold', null)),
  ('payment_methods', jsonb_build_array(
      jsonb_build_object('id','cod','enabled',true,'label_en','Cash on delivery','label_ar','الدفع عند الاستلام',
                         'instructions_en','Pay in cash when your order arrives.','instructions_ar','ادفع نقدًا عند استلام طلبك.'),
      jsonb_build_object('id','instapay','enabled',false,'label_en','InstaPay transfer','label_ar','تحويل إنستاباي',
                         'instructions_en','','instructions_ar',''),
      jsonb_build_object('id','wallet','enabled',false,'label_en','Mobile wallet transfer','label_ar','تحويل محفظة إلكترونية',
                         'instructions_en','','instructions_ar',''))),
  ('home_sections', jsonb_build_object(
      'years', true, 'bundles', true, 'categories', true, 'best_sellers', true,
      'brands', true, 'new_arrivals', true, 'why', true, 'promo', true, 'testimonials', true, 'contact', true)),
  ('home_hero', jsonb_build_object(
      'title_en', 'Everything you need for your dental journey.',
      'title_ar', 'كل ما تحتاجه في رحلتك مع طب الأسنان.',
      'subtitle_en', 'From your first dental practical to your professional practice, find everything you need in one place.',
      'subtitle_ar', 'من أول سكشن عملي في الكلية حتى عيادتك الخاصة، كل احتياجاتك في مكان واحد.',
      'student_image', null, 'dentist_image', null))
on conflict (key) do nothing;
