DROP POLICY IF EXISTS "comments delete own or staff" ON public.comments;
CREATE POLICY "comments delete staff" ON public.comments FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));