-- アップロードテンプレートの並び順を 1 トランザクションで確定する。
-- p_ids は全テンプレートの ID を新しい順番で並べたもの。過不足・重複があれば例外にする
-- （古い一覧を元にした並べ替えで、同時に作成・削除されたテンプレートを取りこぼさないため）。
CREATE OR REPLACE FUNCTION public.reorder_upload_templates(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total integer;
BEGIN
  -- 同時実行時のデッドロックと並びの混在を防ぐため、全行を ID 順にロックしてから更新する
  PERFORM 1 FROM upload_templates ORDER BY id FOR UPDATE;

  SELECT count(*) INTO v_total FROM upload_templates;
  IF coalesce(array_length(p_ids, 1), 0) <> v_total
    OR (SELECT count(DISTINCT x) FROM unnest(p_ids) AS x) <> v_total
    OR EXISTS (SELECT 1 FROM unnest(p_ids) AS x WHERE x NOT IN (SELECT id FROM upload_templates))
  THEN
    RAISE EXCEPTION 'ids do not match upload_templates' USING ERRCODE = '22023';
  END IF;

  UPDATE upload_templates AS t
  SET sort_order = o.ord - 1
  FROM unnest(p_ids) WITH ORDINALITY AS o(id, ord)
  WHERE t.id = o.id;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.reorder_upload_templates(uuid[]) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.reorder_upload_templates(uuid[]) TO service_role;
--> statement-breakpoint
NOTIFY pgrst, 'reload schema';
