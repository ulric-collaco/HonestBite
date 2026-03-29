-- Seed data migrated from PostgreSQL backup

-- 1. Users
INSERT INTO users (user_id, health_conditions, allergies, doctor_link, created_at) VALUES
('user_1760375769580_zl7nndu3o', '["Thyroid Disorders","Kidney Disease"]', '["Shellfish","Eggs","Sesame"]', 'undefined/doctor/user_1760375769580_zl7nndu3o', '2025-10-13 17:16:10.568084'),
('user_1760383337845_yf8m4ndmc', '["Diabetes","Heart Disease"]', '["Peanuts","Dairy"]', 'undefined/doctor/user_1760383337845_yf8m4ndmc', '2025-10-13 19:22:19.28778'),
('user_1760383371680_ezixkufo4', '["Diabetes","Hypertension"]', '["Eggs"]', 'undefined/doctor/user_1760383371680_ezixkufo4', '2025-10-13 19:22:52.600687'),
('user_1760383668573_tg0fxt2sf', '[]', '[]', 'undefined/doctor/user_1760383668573_tg0fxt2sf', '2025-10-13 19:27:50.713291'),
('user_1760404562300_qlpqk5i65', '["Diabetes"]', '[]', 'undefined/doctor/user_1760404562300_qlpqk5i65', '2025-10-14 01:16:03.012298'),
('user_1760465832333_spg4e2xd0', '["Diabetes"]', '["Peanuts"]', 'undefined/doctor/user_1760465832333_spg4e2xd0', '2025-10-14 18:17:13.751742'),
('user_1760476288121_9xeocnnnw', '["Diabetes","Heart Disease"]', '["Eggs"]', 'undefined/doctor/user_1760476288121_9xeocnnnw', '2025-10-14 21:11:29.427368'),
('user_1760628896178_vdu8wb86p', '["Diabetes"]', '["Eggs"]', 'undefined/doctor/user_1760628896178_vdu8wb86p', '2025-10-16 15:35:00.731686'),
('user_1760816692407_5insyjgh9', '["Obesity"]', '["Fish"]', 'undefined/doctor/user_1760816692407_5insyjgh9', '2025-10-18 19:44:53.718174'),
('user_1760819858355_w4s3usayt', '[]', '[]', 'undefined/doctor/user_1760819858355_w4s3usayt', '2025-10-18 20:37:38.693125');

-- 2. FSSAI Products
INSERT INTO fssai_products (barcode, name, brand, category, nutrition_info, created_at) VALUES
('8901030123456', 'Whole Wheat Bread', 'Britannia', 'Bakery', '{"ingredients": "Whole wheat flour, water, yeast, sugar, salt, vegetable oil", "nutrition_facts": {"fat": 2.3, "fiber": 6.5, "sugar": 4.2, "energy": 246, "sodium": 0.42, "protein": 9.1, "carbohydrates": 45.5, "saturated_fat": 0.5}}', '2025-10-13 17:00:16.395251'),
('8901063112148', 'Good Day Butter Cookies', 'Britannia', 'Biscuits', '{"ingredients": "Refined wheat flour, sugar, vegetable oils, butter, milk solids, raising agents, salt", "nutrition_facts": {"fat": 19.1, "fiber": 1.2, "sugar": 27.5, "energy": 474, "sodium": 0.38, "protein": 6.7, "carbohydrates": 67.3, "saturated_fat": 9.8}}', '2025-10-13 17:00:16.395251'),
('8901030741715', 'Maggi 2-Minute Noodles', 'Nestle', 'Instant Noodles', '{"ingredients": "Refined wheat flour, palm oil, salt, thickeners, acidity regulators, flavor enhancers (MSG)", "nutrition_facts": {"fat": 14.9, "fiber": 2.3, "sugar": 2.1, "energy": 412, "sodium": 2.1, "protein": 9.8, "carbohydrates": 60.1, "saturated_fat": 7.2}}', '2025-10-13 17:00:16.395251'),
('8901063012059', 'Marie Gold Biscuits', 'Britannia', 'Biscuits', '{"ingredients": "Refined wheat flour, sugar, vegetable oils, invert syrup, leavening agents, salt, milk solids", "nutrition_facts": {"fat": 10.8, "fiber": 2.1, "sugar": 18.2, "energy": 436, "sodium": 0.52, "protein": 7.1, "carbohydrates": 75.4, "saturated_fat": 5.4}}', '2025-10-13 17:00:16.395251'),
('8906021470018', 'Amul Taaza Toned Milk', 'Amul', 'Dairy', '{"ingredients": "Toned milk, vitamin A & D", "nutrition_facts": {"fat": 3.0, "fiber": 0, "sugar": 4.7, "energy": 58, "sodium": 0.045, "protein": 3.1, "carbohydrates": 4.7, "saturated_fat": 1.8}}', '2025-10-13 17:00:16.395251');

-- 3. Products (Cache)
INSERT INTO products (barcode, name, brand, ingredients, nutrition_facts, truth_score, risk_flags, data_source) VALUES
('8901030123456', 'Whole Wheat Bread', 'Britannia', 'Whole wheat flour, water, yeast, sugar, salt, vegetable oil', '{"fat": 2.3, "fiber": 6.5, "sugar": 4.2, "energy": 246, "sodium": 0.42, "protein": 9.1, "carbohydrates": 45.5, "saturated_fat": 0.5}', 10, '[]', 'FSSAI Manual Database'),
('8901030831706', 'Mixed fruit Jam', 'Kissan', 'SUGAR, MIXED FRUIT PULP BLEND - 60%...', '{"fat": 0, "fiber": 0.66, "sugar": 68.66, "energy": 286, "sodium": 0.05, "protein": 0, "carbohydrates": 70.6, "saturated_fat": 0}', 6, '[]', 'Open Food Facts'),
('80177173', 'Nutella 350g', 'Ferrero', 'Sugar, palm oil, hazelnuts...', '{"fat": 30.9, "fiber": 0, "sugar": 56.3, "energy": 539, "sodium": 0.04, "protein": 6.3, "carbohydrates": 57.5, "saturated_fat": 10.6}', 5, '[]', 'Open Food Facts');

-- 4. Scans
INSERT INTO scans (user_id, product_name, barcode, truth_score, risk_factors, scan_type, scanned_at) VALUES
('user_1760375769580_zl7nndu3o', 'Whole Wheat Bread', '8901030123456', 10, '[]', 'manual', '2025-10-13 17:17:54.369251'),
('user_1760375769580_zl7nndu3o', 'Mixed fruit Jam', '8901030831706', 6, '["High Sugar Content: 68.66667g per 100g","Contains 4 artificial additives"]', 'barcode', '2025-10-13 17:47:09.093911'),
('user_1760383371680_ezixkufo4', 'Nutella 350g', '80177173', 5, '["High Sugar Content: 56.3g per 100g","High Saturated Fat: 10.6g per 100g","High Calorie Density: 539 kcal per 100g"]', 'manual', '2025-10-14 21:53:40.405029'),
('user_1760375769580_zl7nndu3o', 'Ching''s Schezwan Chutney', '8901595862962', 4, '["High Sugar Content: 15.2g per 100g","High Sodium: 1350mg per 100g","High Saturated Fat: 3.4g per 100g","Contains 5 artificial additives"]', 'manual', '2025-10-17 14:41:38.198127');
