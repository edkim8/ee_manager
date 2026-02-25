-- Add 'Trust' to ownership_entities entity_type check constraint
ALTER TABLE public.ownership_entities
  DROP CONSTRAINT IF EXISTS ownership_entities_entity_type_check;

ALTER TABLE public.ownership_entities
  ADD CONSTRAINT ownership_entities_entity_type_check
  CHECK (entity_type = ANY (ARRAY[
    'LLC'::text,
    'Corporation'::text,
    'Individual'::text,
    'Partnership'::text,
    'REIT'::text,
    'Trust'::text
  ]));
