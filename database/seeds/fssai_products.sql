-- Seed data for FSSAI products database
-- Common Indian products with nutrition information

INSERT INTO fssai_products (barcode, name, brand, category, fssai_approved, nutrition_info) VALUES
('8901030123456', 'Whole Wheat Bread', 'Britannia', 'Bakery', TRUE, '{
  "nutrition_facts": {
    "energy": 246,
    "protein": 9.1,
    "carbohydrates": 45.5,
    "sugar": 4.2,
    "fat": 2.3,
    "saturated_fat": 0.5,
    "sodium": 0.42,
    "fiber": 6.5
  },
  "ingredients": "Whole wheat flour, water, yeast, sugar, salt, vegetable oil"
}'),

('8901063112148', 'Good Day Butter Cookies', 'Britannia', 'Biscuits', TRUE, '{
  "nutrition_facts": {
    "energy": 474,
    "protein": 6.7,
    "carbohydrates": 67.3,
    "sugar": 27.5,
    "fat": 19.1,
    "saturated_fat": 9.8,
    "sodium": 0.38,
    "fiber": 1.2
  },
  "ingredients": "Refined wheat flour, sugar, vegetable oils, butter, milk solids, raising agents, salt"
}'),

('8901030741715', 'Maggi 2-Minute Noodles', 'Nestle', 'Instant Noodles', TRUE, '{
  "nutrition_facts": {
    "energy": 412,
    "protein": 9.8,
    "carbohydrates": 60.1,
    "sugar": 2.1,
    "fat": 14.9,
    "saturated_fat": 7.2,
    "sodium": 2.1,
    "fiber": 2.3
  },
  "ingredients": "Refined wheat flour, palm oil, salt, thickeners, acidity regulators, flavor enhancers (MSG)"
}'),

('8901063012059', 'Marie Gold Biscuits', 'Britannia', 'Biscuits', TRUE, '{
  "nutrition_facts": {
    "energy": 436,
    "protein": 7.1,
    "carbohydrates": 75.4,
    "sugar": 18.2,
    "fat": 10.8,
    "saturated_fat": 5.4,
    "sodium": 0.52,
    "fiber": 2.1
  },
  "ingredients": "Refined wheat flour, sugar, vegetable oils, invert syrup, leavening agents, salt, milk solids"
}'),

('8906021470018', 'Amul Taaza Toned Milk', 'Amul', 'Dairy', TRUE, '{
  "nutrition_facts": {
    "energy": 58,
    "protein": 3.1,
    "carbohydrates": 4.7,
    "sugar": 4.7,
    "fat": 3.0,
    "saturated_fat": 1.8,
    "sodium": 0.045,
    "fiber": 0
  },
  "ingredients": "Toned milk, vitamin A & D"
}'),

('8901063012127', 'Bourbon Biscuits', 'Britannia', 'Biscuits', TRUE, '{
  "nutrition_facts": {
    "energy": 481,
    "protein": 6.4,
    "carbohydrates": 68.2,
    "sugar": 31.5,
    "fat": 20.1,
    "saturated_fat": 10.8,
    "sodium": 0.28,
    "fiber": 1.8
  },
  "ingredients": "Refined wheat flour, sugar, vegetable oils, cocoa solids, milk solids, raising agents"
}'),

('8901491101158', 'Tata Salt', 'Tata', 'Condiments', TRUE, '{
  "nutrition_facts": {
    "energy": 0,
    "protein": 0,
    "carbohydrates": 0,
    "sugar": 0,
    "fat": 0,
    "saturated_fat": 0,
    "sodium": 38.758,
    "fiber": 0
  },
  "ingredients": "Iodised salt"
}'),

('8901725111502', 'MTR Rava Idli Mix', 'MTR', 'Ready-to-Cook', TRUE, '{
  "nutrition_facts": {
    "energy": 358,
    "protein": 7.2,
    "carbohydrates": 75.6,
    "sugar": 1.2,
    "fat": 2.1,
    "saturated_fat": 0.4,
    "sodium": 1.86,
    "fiber": 3.8
  },
  "ingredients": "Semolina, rice flour, Bengal gram flour, salt, citric acid, vegetable oil"
}'),

('8901262000123', 'Fortune Sunflower Oil', 'Fortune', 'Cooking Oil', TRUE, '{
  "nutrition_facts": {
    "energy": 900,
    "protein": 0,
    "carbohydrates": 0,
    "sugar": 0,
    "fat": 100,
    "saturated_fat": 11,
    "sodium": 0,
    "fiber": 0
  },
  "ingredients": "Refined sunflower oil, vitamin A & D"
}'),

('8901063010123', 'Britannia NutriChoice Digestive', 'Britannia', 'Biscuits', TRUE, '{
  "nutrition_facts": {
    "energy": 454,
    "protein": 7.8,
    "carbohydrates": 66.2,
    "sugar": 15.8,
    "fat": 16.5,
    "saturated_fat": 8.2,
    "sodium": 0.58,
    "fiber": 4.2
  },
  "ingredients": "Whole wheat flour, refined wheat flour, sugar, vegetable oils, oats, raising agents"
}');

-- Add more common products (snacks, beverages, etc.)
INSERT INTO fssai_products (barcode, name, brand, category, fssai_approved, nutrition_info) VALUES
('8901058801170', 'Parle-G Biscuits', 'Parle', 'Biscuits', TRUE, '{
  "nutrition_facts": {
    "energy": 462,
    "protein": 7.0,
    "carbohydrates": 75.6,
    "sugar": 20.5,
    "fat": 13.5,
    "saturated_fat": 6.8,
    "sodium": 0.35,
    "fiber": 2.1
  },
  "ingredients": "Refined wheat flour, sugar, vegetable oils, invert sugar syrup, leavening agents"
}'),

('8901063011014', 'Britannia 50-50 Biscuits', 'Britannia', 'Biscuits', TRUE, '{
  "nutrition_facts": {
    "energy": 476,
    "protein": 7.2,
    "carbohydrates": 67.8,
    "sugar": 18.9,
    "fat": 18.9,
    "saturated_fat": 9.5,
    "sodium": 0.82,
    "fiber": 1.5
  },
  "ingredients": "Refined wheat flour, sugar, vegetable oils, salt, milk solids, raising agents"
}'),

('8902102450016', 'Haldiram Aloo Bhujia', 'Haldiram', 'Snacks', TRUE, '{
  "nutrition_facts": {
    "energy": 529,
    "protein": 15.2,
    "carbohydrates": 43.5,
    "sugar": 3.2,
    "fat": 31.8,
    "saturated_fat": 8.9,
    "sodium": 1.42,
    "fiber": 5.6
  },
  "ingredients": "Gram flour, potato flakes, vegetable oil, spices, salt"
}');
