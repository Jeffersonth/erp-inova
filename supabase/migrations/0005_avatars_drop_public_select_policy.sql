-- Bucket público já serve objetos via URL pública sem precisar de policy de SELECT
-- (essa policy só habilitava listagem/enumeração desnecessária do bucket).
drop policy "avatars_public_read" on storage.objects;
