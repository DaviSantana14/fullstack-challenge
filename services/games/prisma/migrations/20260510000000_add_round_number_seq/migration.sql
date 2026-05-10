DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'round_number_seq' AND relkind = 'S'
  ) THEN
    CREATE SEQUENCE round_number_seq;
    PERFORM setval('round_number_seq', COALESCE(
      (SELECT MAX("roundNumber") FROM "rounds"), 0
    ));
  END IF;
END $$;
