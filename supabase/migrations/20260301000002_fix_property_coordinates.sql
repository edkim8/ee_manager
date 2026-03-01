-- Fix swapped latitude/longitude values in properties table.
-- All 5 properties were stored with lat and lng columns reversed.
-- Correct format: latitude = N/S decimal (~32–34 for AZ/CA), longitude = E/W decimal (~-111 to -117 for AZ/CA)

UPDATE properties SET latitude =  33.4653, longitude = -111.990 WHERE code = 'RS';
UPDATE properties SET latitude =  33.2905, longitude = -111.848 WHERE code = 'SB';
UPDATE properties SET latitude =  32.7142, longitude = -117.149 WHERE code = 'CV';
UPDATE properties SET latitude =  32.5572, longitude = -117.057 WHERE code = 'OB';
UPDATE properties SET latitude =  33.1460, longitude = -117.164 WHERE code = 'WO';
